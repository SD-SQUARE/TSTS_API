import { t } from "i18next";
import { userRepository } from "../../../repositories/UserRepository.js";
import { UserType } from "../../../enums/UserType.enum.js";
import { IMAGE_PATHS } from "../../../constants/imagePathes.js";
import { deleteFile } from "../../../utils/storage.js";
import logger from "../../../utils/logger.js";
import { validateEntities } from "../../../helpers/EntitiesValidatorHelper.js";
import { validateExistingPermission } from "../../../helpers/ProfileAndPermissionValidatorHelper.js";
import { validateExistingSpecializations } from "../../../helpers/specializationValidatorHelper.js";
import { PostgresDataSource } from "../../../database/postgres-data-source.js";
import { UsersPermissions } from "../../../entities/UsersPermissions.js";
import { AllowedSpecialization } from "../../../entities/AllowedSpecialization.js";
import { User } from "../../../entities/index.js";
import { ICreateResponse } from "../../../interfaces/response/ICreateResponse.js";
import { IEditResponse } from "../../../interfaces/response/IEditResponse.js";
import { uploadFilesWithUniqueKey } from "../../../helpers/ImagesHelper.js";
import { IDeleteResponse } from "../../../interfaces/response/IDeleteResponse.js";
import { CreateAdminMapped } from "../../../interfaces/admin/ICreateAdmin.js";
import { mapAdminToUserEntity } from "../../../mappers/admin/adminToUserEntity.js";
import { audit } from "../../../helpers/auditBuilder.js";

export const createAdminService = async (
  AdminDto: CreateAdminMapped,
  imageFile?: Express.Multer.File,
  req?: any,
): Promise<ICreateResponse> => {
  audit(req).metadata({ dto: AdminDto }).step("Service initiated");

  // 2) university + domain + departments in ONE helper
  const entitiesResult = await validateEntities(
    AdminDto.university,
    AdminDto.domain,
  );

  if (!entitiesResult.is_valid) {
    audit(req).step("Entity validation failed").metadata({ errors: entitiesResult.errors });
    return {
      is_added: false,
      message: "",
      errors: entitiesResult.errors,
    };
  }

  const { university, domain } = entitiesResult;

  // 3) validate permission profile + extra/revoked permissions
  const permResult = await validateExistingPermission(
    AdminDto.permissionProfile,
    AdminDto.extraPermissions,
    AdminDto.revokedPermissions,
  );

  if (!permResult.is_valid) {
    audit(req).step("Permission validation failed").metadata({ errors: permResult.errors });
    return {
      is_added: false,
      message: "",
      errors: permResult.errors,
    };
  }

  // Specialization assignment is intentionally not editable from user forms.

  // 7) Set user type
  AdminDto.userType = UserType.ADMIN;
  audit(req).step("User type set to ADMIN");

  // 8) Map DTO → Entity
  const userData = await mapAdminToUserEntity(AdminDto);
  userData.university = university;
  userData.domain = domain;
  audit(req).step("Mapped DTO to User entity").metadata({ userEmail: userData.email });

  // 9) Handle image upload if exists
  if (imageFile) {
    const safeKey = await uploadFilesWithUniqueKey(
      IMAGE_PATHS.UsersImages,
      AdminDto.ssn,
      imageFile,
    );
    userData.image = safeKey;
    audit(req).step("Admin image uploaded").metadata({ imageKey: safeKey });
  }

  // 10) Save user
  const user = await userRepository.createAndSave(userData);
  audit(req).resource("USER", user.id).step("User saved to database").metadata({ email: userData.email });

  logger.info(`[server] [user] Creating user ${userData.email}`);
  const usersPermissionsRepo =
    PostgresDataSource.getRepository(UsersPermissions);
  const allowedSpecializationsRepo = PostgresDataSource.getRepository(
    AllowedSpecialization,
  );

  const profile = permResult.profile!;

  // 11) Save usersPermissions
  await usersPermissionsRepo.save(
    usersPermissionsRepo.create({
      user,
      permissionProfile: profile,
      extraPermissions: AdminDto.extraPermissions,
      revokedPermissions: AdminDto.revokedPermissions,
    }),
  );
  audit(req).step("User permissions saved").metadata({ permissionProfile: profile.name });

  // Specialization assignment is intentionally not editable from user forms.

  audit(req).step("Admin creation process completed successfully").metadata({ userId: user.id, email: user.email });

  return { is_added: true, message: t("user_created") };
};

export const editAdminService = async (
  id: string,
  AdminDto: CreateAdminMapped,
  imageFile?: Express.Multer.File,
  req?: any,
): Promise<IEditResponse> => {
  const userRepo = PostgresDataSource.getRepository(User);
  const usersPermissionsRepo =
    PostgresDataSource.getRepository(UsersPermissions);
  const allowedSpecializationsRepo = PostgresDataSource.getRepository(
    AllowedSpecialization,
  );

  // 0) Load existing user
  const userEntity = await userRepo.findOne({
    where: { id },
    relations: ["usersPermissions", "allowedSpecializations"],
  });

  if (!userEntity) {
    audit(req).step("User not found for editing");
    return { is_edited: false, message: t("user_not_found"), errors: [] };
  }
  const isSelfProfileEdit = req?.user?.id === id;

  audit(req).step("Existing user loaded").metadata({ userId: id });

  // 2) Validate university + domain + departments
  const entitiesResult = await validateEntities(
    AdminDto.university,
    AdminDto.domain,
  );

  if (!entitiesResult.is_valid) {
    audit(req).step("Entity validation failed").metadata({ errors: entitiesResult.errors });
    return {
      is_edited: false,
      message: "",
      errors: entitiesResult.errors,
    };
  }

  const { university, domain } = entitiesResult;

  // 3) Validate permission profile + extra/revoked permissions
  const permResult = await validateExistingPermission(
    AdminDto.permissionProfile,
    AdminDto.extraPermissions,
    AdminDto.revokedPermissions,
  );

  if (!permResult.is_valid) {
    audit(req).step("Permission validation failed").metadata({ errors: permResult.errors });
    return {
      is_edited: false,
      message: "",
      errors: permResult.errors,
    };
  }

  // Specialization assignment is intentionally not editable from user forms.

  // 5) Force user type
  AdminDto.userType = UserType.ADMIN;

  // 6) Map DTO → partial User and merge into existing entity
  const userData = await mapAdminToUserEntity(AdminDto);
  if (isSelfProfileEdit) {
    delete userData.email;
    delete userData.password;
  }

  userRepo.merge(userEntity, userData);
  userEntity.university = university;
  userEntity.domain = domain;
  audit(req).step("Mapped DTO to User entity and merged").metadata({ userEmail: userEntity.email });

  // 7) Handle image upload if exists
  if (imageFile) {
    // delete the old image

    deleteFile(process.env.MINIO_BUCKET, userEntity.image);

    const safeKey = await uploadFilesWithUniqueKey(
      IMAGE_PATHS.UsersImages,
      AdminDto.ssn,
      imageFile,
    );
    userEntity.image = safeKey;
    audit(req).step("Admin image uploaded").metadata({ imageKey: safeKey });
  }

  // 8) Save updated user
  const user = await userRepo.save(userEntity);

  logger.info(`[server] [user] Editing user ${userEntity.email}`);

  audit(req).step("User saved to database").metadata({ userId: user.id });

  // 9) Clear old relations and re-create them

  // 9.1) UsersPermissions – assume one row per user, so delete & recreate
  if (!isSelfProfileEdit) {
    await usersPermissionsRepo.delete({ user: { id: user.id } as any });

    const profile = permResult.profile!;
    await usersPermissionsRepo.save(
      usersPermissionsRepo.create({
        user,
        permissionProfile: profile,
        extraPermissions: AdminDto.extraPermissions,
        revokedPermissions: AdminDto.revokedPermissions,
      }),
    );
    audit(req).step("User permissions saved").metadata({ permissionProfile: profile.name });
  }

  // 9.3) AllowedSpecializations – clear then add
  // Specialization assignment is intentionally not editable from user forms.

  audit(req).step("Admin edit process completed successfully").metadata({ userId: user.id, email: user.email });

  return { is_edited: true, message: "Admin_edited_successfully" };
};

export const deleteAdminService = async (
  id: string,
  req?: any,
): Promise<IDeleteResponse> => {
  const userRepo = PostgresDataSource.getRepository(User);

  // 0) Load existing user
  const userEntity = await userRepo.findOne({ where: { id } });

  if (!userEntity) {
    audit(req).step("User not found for deletion");
    return { is_deleted: false, message: t("user_not_found") };
  }
  audit(req).step("User loaded for deletion").metadata({ email: userEntity.email });

  // 1) Delete user (soft delete)
  // await userRepo.softDelete(id);
  userEntity.deletedAt = new Date();
  await userRepo.update(id, userEntity);
  audit(req).step("User soft-deleted").metadata({ deletedAt: userEntity.deletedAt });

  logger.info(`[server] [user] Deleted user ${userEntity.email}`);
  return { is_deleted: true, message: t("user_deleted") };
};
