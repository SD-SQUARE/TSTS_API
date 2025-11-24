import { t } from "i18next";
import { userRepository } from "../../../repositories/UserRepository.js";
import { UserType } from "../../../enums/UserType.enum.js";
import { IMAGE_PATHS } from "../../../constants/imagePathes.js";
import { deleteFile, uploadFile } from "../../../utils/storage.js";
import logger from "../../../utils/logger.js";
import { validateEntities } from "../../../helpers/EntitiesValidatorHelper.js";
import { validateExistingPermission } from "../../../helpers/ProfileAndPermissionValidatorHelper.js";
import { validateExistingSpecializations } from "../../../helpers/specializationValidatorHelper.js";
import { PostgresDataSource } from "../../../database/postgres-data-source.js";
import { UserDepartment } from "../../../entities/UserDepartment.js";
import { UsersPermissions } from "../../../entities/UsersPermissions.js";
import { AllowedSpecialization } from "../../../entities/AllowedSpecialization.js";
import { User } from "../../../entities/index.js";
import { ICreateResponse } from "../../../interfaces/response/ICreateResponse.js";
import { IEditResponse } from "../../../interfaces/response/IEditResponse.js";
import { uploadFilesWithUniqueKey } from "../../../helpers/ImagesHelper.js";
import { IDeleteResponse } from "../../../interfaces/response/IDeleteResponse.js";
import { CreateAdminMapped } from "../../../interfaces/admin/ICreateAdmin.js";
import { mapAdminToUserEntity } from "../../../mappers/admin/adminToUserEntity.js";

export const createAdminService = async (
  AdminDto: CreateAdminMapped,
  imageFile?: Express.Multer.File
): Promise<ICreateResponse> => {
  // 2) university + domain + departments in ONE helper
  const entitiesResult = await validateEntities(
    AdminDto.university,
    AdminDto.domain,
    AdminDto.departments
  );

  if (!entitiesResult.is_valid) {
    return {
      is_added: false,
      message: "",
      errors: entitiesResult.errors,
    };
  }

  const {
    university,
    domain,
    departments: existingDepartments = [],
  } = entitiesResult;

  // 3) validate permission profile + extra/revoked permissions
  const permResult = await validateExistingPermission(
    AdminDto.permissionProfile,
    AdminDto.extraPermissions,
    AdminDto.revokedPermissions
  );

  if (!permResult.is_valid) {
    return {
      is_added: false,
      message: "",
      errors: permResult.errors,
    };
  }

  const specsResult = await validateExistingSpecializations(
    AdminDto.allowedSpecializations
  );

  if (!specsResult.is_valid) {
    return {
      is_added: false,
      message: "",
      errors: specsResult.errors,
    };
  }

  // 7) Set user type
  AdminDto.userType = UserType.ADMIN;

  // 8) Map DTO → Entity
  const userData = await mapAdminToUserEntity(AdminDto);
  userData.university = university;
  userData.domain = domain;

  // 9) Handle image upload if exists
  if (imageFile) {
    const safeKey = await uploadFilesWithUniqueKey(
      IMAGE_PATHS.UsersImages,
      AdminDto.ssn,
      imageFile
    );
    userData.image = safeKey;
  }

  // 10) Save user
  const user = await userRepository.createAndSave(userData);
  logger.info(`[server] [user] Creating user ${userData.email}`);
  const userDepartmentsRepo = PostgresDataSource.getRepository(UserDepartment);
  const usersPermissionsRepo =
    PostgresDataSource.getRepository(UsersPermissions);
  const allowedSpecializationsRepo = PostgresDataSource.getRepository(
    AllowedSpecialization
  );

  // 11) Save departments
  if (existingDepartments.length > 0) {
    const userDepartments = existingDepartments.map((dept) =>
      userDepartmentsRepo.create({
        user,
        department: dept,
      })
    );
    await userDepartmentsRepo.save(userDepartments);
  }

  const profile = permResult.profile!;

  // 12) Save usersPermissions
  await usersPermissionsRepo.save(
    usersPermissionsRepo.create({
      user,
      permissionProfile: profile,
      extraPermissions: AdminDto.extraPermissions,
      revokedPermissions: AdminDto.revokedPermissions,
    })
  );

  // 13) Save allowedSpecializations
  if (AdminDto.allowedSpecializations?.length > 0) {
    await allowedSpecializationsRepo.save(
      AdminDto.allowedSpecializations.map((specId) =>
        allowedSpecializationsRepo.create({
          user,
          specialization: { id: specId } as any,
        })
      )
    );
  }

  return { is_added: true, message: t("user_created") };
};

export const editAdminService = async (
  id: string,
  AdminDto: CreateAdminMapped,
  imageFile?: Express.Multer.File
): Promise<IEditResponse> => {
  const userRepo = PostgresDataSource.getRepository(User);
  const userDepartmentsRepo = PostgresDataSource.getRepository(UserDepartment);
  const usersPermissionsRepo =
    PostgresDataSource.getRepository(UsersPermissions);
  const allowedSpecializationsRepo = PostgresDataSource.getRepository(
    AllowedSpecialization
  );

  // 0) Load existing user
  const userEntity = await userRepo.findOne({
    where: { id },
    relations: [
      "userDepartments",
      "usersPermissions",
      "allowedSpecializations",
    ],
  });

  if (!userEntity) {
    return { is_edited: false, message: t("user_not_found"), errors: [] };
  }

  // 2) Validate university + domain + departments
  const entitiesResult = await validateEntities(
    AdminDto.university,
    AdminDto.domain,
    AdminDto.departments
  );

  if (!entitiesResult.is_valid) {
    return {
      is_edited: false,
      message: "",
      errors: entitiesResult.errors,
    };
  }

  const {
    university,
    domain,
    departments: existingDepartments = [],
  } = entitiesResult;

  // 3) Validate permission profile + extra/revoked permissions
  const permResult = await validateExistingPermission(
    AdminDto.permissionProfile,
    AdminDto.extraPermissions,
    AdminDto.revokedPermissions
  );

  if (!permResult.is_valid) {
    return {
      is_edited: false,
      message: "",
      errors: permResult.errors,
    };
  }

  // 4) Validate allowed specializations
  const specsResult = await validateExistingSpecializations(
    AdminDto.allowedSpecializations
  );

  if (!specsResult.is_valid) {
    return {
      is_edited: false,
      message: "",
      errors: specsResult.errors,
    };
  }

  // 5) Force user type
  AdminDto.userType = UserType.ADMIN;

  // 6) Map DTO → partial User and merge into existing entity
  const userData = await mapAdminToUserEntity(AdminDto);

  userRepo.merge(userEntity, userData);
  userEntity.university = university;
  userEntity.domain = domain;

  // 7) Handle image upload if exists
  if (imageFile) {
    // delete the old image

    deleteFile(process.env.MINIO_BUCKET, userEntity.image);

    const safeKey = await uploadFilesWithUniqueKey(
      IMAGE_PATHS.UsersImages,
      AdminDto.ssn,
      imageFile
    );
    userEntity.image = safeKey;
  }

  // 8) Save updated user
  const user = await userRepo.save(userEntity);

  logger.info(`[server] [user] Editing user ${userEntity.email}`);

  // 9) Clear old relations and re-create them

  // 9.1) UserDepartments
  await userDepartmentsRepo.delete({ user: { id: user.id } as any });

  if (existingDepartments.length > 0) {
    const userDepartments = existingDepartments.map((dept) =>
      userDepartmentsRepo.create({
        user,
        department: dept,
      })
    );
    await userDepartmentsRepo.save(userDepartments);
  }

  // 9.2) UsersPermissions – assume one row per user, so delete & recreate
  await usersPermissionsRepo.delete({ user: { id: user.id } as any });

  const profile = permResult.profile!;
  await usersPermissionsRepo.save(
    usersPermissionsRepo.create({
      user,
      permissionProfile: profile,
      extraPermissions: AdminDto.extraPermissions,
      revokedPermissions: AdminDto.revokedPermissions,
    })
  );

  // 9.3) AllowedSpecializations – clear then add
  await allowedSpecializationsRepo.delete({ user: { id: user.id } as any });

  if (AdminDto.allowedSpecializations?.length > 0) {
    await allowedSpecializationsRepo.save(
      AdminDto.allowedSpecializations.map((specId) =>
        allowedSpecializationsRepo.create({
          user,
          specialization: { id: specId } as any,
        })
      )
    );
  }

  return { is_edited: true, message: "Admin_edited_successfully" };
};

export const deleteAdminService = async (
  id: string
): Promise<IDeleteResponse> => {
  const userRepo = PostgresDataSource.getRepository(User);

  // 0) Load existing user
  const userEntity = await userRepo.findOne({ where: { id } });

  if (!userEntity) {
    return { is_deleted: false, message: t("user_not_found") };
  }

  // 1) Delete user (soft delete)
  // await userRepo.softDelete(id);
  userEntity.deletedAt = new Date();
  await userRepo.update(id, userEntity);

  logger.info(`[server] [user] Deleted user ${userEntity.email}`);
  return { is_deleted: true, message: t("user_deleted") };
};
