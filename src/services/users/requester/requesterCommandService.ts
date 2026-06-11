import { t } from "i18next";
import { userRepository } from "../../../repositories/UserRepository.js";
import { UserType } from "../../../enums/UserType.enum.js";
import { IMAGE_PATHS } from "../../../constants/imagePathes.js";
import { deleteFile, uploadFile } from "../../../utils/storage.js";
import logger from "../../../utils/logger.js";
import { validateEntities } from "../../../helpers/EntitiesValidatorHelper.js";
import { validateExistingPermission } from "../../../helpers/ProfileAndPermissionValidatorHelper.js";
import { validateExistingSpecializations } from "../../../helpers/specializationValidatorHelper.js";
import { mapRequesterToUserEntity } from "../../../mappers/requester/requesterToUserEntity.js";
import { PostgresDataSource } from "../../../database/postgres-data-source.js";
import { UserDepartment } from "../../../entities/UserDepartment.js";
import { UsersPermissions } from "../../../entities/UsersPermissions.js";
import { AllowedSpecialization } from "../../../entities/AllowedSpecialization.js";
import { User } from "../../../entities/index.js";
import { ICreateResponse } from "../../../interfaces/response/ICreateResponse.js";
import { IEditResponse } from "../../../interfaces/response/IEditResponse.js";
import { uploadFilesWithUniqueKey } from "../../../helpers/ImagesHelper.js";
import { IDeleteResponse } from "../../../interfaces/response/IDeleteResponse.js";
import { CreateRequesterMapped } from "../../../interfaces/requester/ICreateRequester.js";
import { audit } from "../../../helpers/auditBuilder.js";
import { Request } from "express";

export const createRequesterService = async (
  requesterDto: CreateRequesterMapped,
  imageFile?: Express.Multer.File,
  req?: any,
): Promise<ICreateResponse> => {
  const auditLog = audit(req);
  // 2) university + domain + departments in ONE helper
  const entitiesResult = await validateEntities(
    requesterDto.university,
    requesterDto.domain,
    requesterDto.departments
  );

  if (!entitiesResult.is_valid) {
     auditLog
      .metadata({ errors: entitiesResult.errors })
      .step("Invalid university/domain/departments");

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
    requesterDto.permissionProfile,
    requesterDto.extraPermissions,
    requesterDto.revokedPermissions
  );

  if (!permResult.is_valid) {
     auditLog
      .metadata({ errors: permResult.errors })
      .step("Invalid permission configuration");

    return {
      is_added: false,
      message: "",
      errors: permResult.errors,
    };
  }

  // Specialization assignment is intentionally not editable from user forms.

  // 7) Set user type
  requesterDto.userType = UserType.REQUESTER;

  // 8) Map DTO → Entity
  const userData = await mapRequesterToUserEntity(requesterDto);
  userData.university = university;
  userData.domain = domain;

  // 9) Handle image upload if exists
  if (imageFile) {
    const safeKey = await uploadFilesWithUniqueKey(
      IMAGE_PATHS.UsersImages,
      requesterDto.ssn,
      imageFile
    );
    userData.image = safeKey;

    auditLog.step("User image uploaded");
  }

  // 10) Save user
  const user = await userRepository.createAndSave(userData);
  logger.info(`[server] [user] Creating user ${userData.email}`);

  auditLog
    .resource("User", user.id)
    .metadata({
      email: user.email,
      hasImage: !!imageFile,
      departmentsCount: existingDepartments.length,
      specializationsCount: 0,
    })
    .step("User entity created");

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
    auditLog.step("User departments assigned");
  }

  const profile = permResult.profile!;

  // 12) Save usersPermissions
  await usersPermissionsRepo.save(
    usersPermissionsRepo.create({
      user,
      permissionProfile: profile,
      extraPermissions: requesterDto.extraPermissions,
      revokedPermissions: requesterDto.revokedPermissions,
    })
  );
  auditLog.step("User permissions assigned");

  // Specialization assignment is intentionally not editable from user forms.

  return { is_added: true, message: t("user_created") };
};

export const editRequesterService = async (
  id: string,
  requesterDto: CreateRequesterMapped,
  imageFile?: Express.Multer.File,
  req?: Request,
): Promise<IEditResponse> => {
   const auditLog = audit(req);

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
    auditLog.step("Requester not found");
    return { is_edited: false, message: t("user_not_found"), errors: [] };
  }

  const userDepartments = await Promise.resolve(userEntity.userDepartments ?? []);
  const usersPermissions = await Promise.resolve(
    userEntity.usersPermissions ?? [],
  );
  const allowedSpecializations = await Promise.resolve(
    userEntity.allowedSpecializations ?? [],
  );
  const isSelfProfileEdit = req?.user?.id === id;

  const oldValues = {
    email: userEntity.email,
    university: userEntity.university?.id,
    domain: userEntity.domain?.id,
    departments: await Promise.all(
      (Array.isArray(userDepartments) ? userDepartments : []).map(
        async (d) => (await d.department)?.id ?? null,
      ),
    ),
    permissions: await Promise.all(
      (Array.isArray(usersPermissions) ? usersPermissions : []).map(
        async (up) => (await up.permissionProfile)?.id ?? null,
      ),
    ),
    specializations: await Promise.all(
      (Array.isArray(allowedSpecializations) ? allowedSpecializations : []).map(
        async (s) => (await s.specialization)?.id ?? null,
      ),
    ),
    hasImage: !!userEntity.image,
  };

  // 2) Validate university + domain + departments
  const entitiesResult = await validateEntities(
    requesterDto.university,
    requesterDto.domain,
    requesterDto.departments
  );

  if (!entitiesResult.is_valid) {
    auditLog.step("Invalid university/domain/departments");

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
    requesterDto.permissionProfile,
    requesterDto.extraPermissions,
    requesterDto.revokedPermissions
  );

  if (!permResult.is_valid) {
    auditLog.step("Invalid permission configuration");

    return {
      is_edited: false,
      message: "",
      errors: permResult.errors,
    };
  }

  // Specialization assignment is intentionally not editable from user forms.

  // 5) Force user type
  requesterDto.userType = UserType.REQUESTER;

  // 6) Map DTO → partial User and merge into existing entity
  const userData = await mapRequesterToUserEntity(requesterDto);
  if (isSelfProfileEdit) {
    delete userData.email;
    delete userData.password;
  }

  userRepo.merge(userEntity, userData);
  userEntity.university = university;
  userEntity.domain = domain;

  // 7) Handle image upload if exists
  if (imageFile) {
    // delete the old image

    deleteFile(process.env.MINIO_BUCKET, userEntity.image);

    const safeKey = await uploadFilesWithUniqueKey(
      IMAGE_PATHS.UsersImages,
      requesterDto.ssn,
      imageFile
    );
    userEntity.image = safeKey;

    auditLog.step("User image updated");
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
  if (!isSelfProfileEdit) {
    await usersPermissionsRepo.delete({ user: { id: user.id } as any });

    const profile = permResult.profile!;
    await usersPermissionsRepo.save(
      usersPermissionsRepo.create({
        user,
        permissionProfile: profile,
        extraPermissions: requesterDto.extraPermissions,
        revokedPermissions: requesterDto.revokedPermissions,
      })
    );
  }

  // 9.3) AllowedSpecializations – clear then add
  // Specialization assignment is intentionally not editable from user forms.

  const newValues = {
    email: user.email,
    university: university?.id,
    domain: domain?.id,
    departments: existingDepartments.map((d) => d.id),
    permissions: isSelfProfileEdit ? oldValues.permissions : permResult.profile?.id,
    specializations: oldValues.specializations,
    hasImage: !!user.image,
  };

  auditLog
    .resource("User", user.id)
    .metadata({
      oldValue: oldValues,
      newValue: newValues,
    })
    .step("Requester updated");

  return { is_edited: true, message: "requester_edited_successfully" };
};

export const deleteRequesterService = async (
  id: string,
  req?: Request
): Promise<IDeleteResponse> => {
  const auditLog = audit(req);

  const userRepo = PostgresDataSource.getRepository(User);

  // 0) Load existing user
  const userEntity = await userRepo.findOne({ where: { id } });

  if (!userEntity) {
    auditLog.step("Requester not found");
    return { is_deleted: false, message: t("user_not_found") };
  }

  // 1) Delete user (soft delete)
  // await userRepo.softDelete(id);
  userEntity.deletedAt = new Date();
  await userRepo.update(id, userEntity);

  auditLog
    .resource("User", userEntity.id)
    .step("Requester soft-deleted");

  logger.info(`[server] [user] Deleted user ${userEntity.email}`);
  return { is_deleted: true, message: t("user_deleted") };
};
