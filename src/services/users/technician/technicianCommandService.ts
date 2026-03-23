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
import { UsersPermissions } from "../../../entities/UsersPermissions.js";
import { AllowedSpecialization } from "../../../entities/AllowedSpecialization.js";
import { User } from "../../../entities/index.js";
import { ICreateResponse } from "../../../interfaces/response/ICreateResponse.js";
import { IEditResponse } from "../../../interfaces/response/IEditResponse.js";
import { uploadFilesWithUniqueKey } from "../../../helpers/ImagesHelper.js";
import { IDeleteResponse } from "../../../interfaces/response/IDeleteResponse.js";

import { mapTechnicianToUserEntity } from "../../../mappers/technician/technicianToUserEntity.js";
import { CreateTechnicianMapped } from "../../../interfaces/technician/ICreateTechnician.js";
import { Request } from "express";
import { audit } from "../../../helpers/auditBuilder.js";

export const createTechnicianService = async (
  technicianDto: CreateTechnicianMapped,
  imageFile?: Express.Multer.File,
  req?: Request,
): Promise<ICreateResponse> => {
  const auditLog = audit(req);

  // 2) university + domain in ONE helper
  const entitiesResult = await validateEntities(
    technicianDto.university,
    technicianDto.domain,
  );

  if (!entitiesResult.is_valid) {
    auditLog
    .metadata({ errors: entitiesResult.errors })
    .step("Invalid university/domain");
    return {
      is_added: false,
      message: "",
      errors: entitiesResult.errors,
    };
  }

  const { university, domain } = entitiesResult;

  // 3) validate permission profile + extra/revoked permissions
  const permResult = await validateExistingPermission(
    technicianDto.permissionProfile,
    technicianDto.extraPermissions,
    technicianDto.revokedPermissions,
  );

  if (!permResult.is_valid) {
    auditLog.metadata({ errors: permResult.errors }).step("Invalid permission configuration");

    return {
      is_added: false,
      message: "",
      errors: permResult.errors,
    };
  }

  const specsResult = await validateExistingSpecializations(
    technicianDto.allowedSpecializations,
  );

  if (!specsResult.is_valid) {
    auditLog.metadata({ errors: specsResult.errors }).step("Invalid specializations");

    return {
      is_added: false,
      message: "",
      errors: specsResult.errors,
    };
  }

  // 7) Set user type
  technicianDto.userType = UserType.TECHNICIAN;

  // 8) Map DTO → Entity
  const userData = await mapTechnicianToUserEntity(technicianDto);
  userData.university = university;
  userData.domain = domain;

  // 9) Handle image upload if exists
  if (imageFile) {
    const safeKey = await uploadFilesWithUniqueKey(
      IMAGE_PATHS.UsersImages,
      technicianDto.ssn,
      imageFile,
    );
    userData.image = safeKey;

    auditLog.step("User image uploaded");
  }

  // 10) Save user
  const user = await userRepository.createAndSave(userData);
  logger.info(`[server] [user] Creating user ${userData.email}`);

  auditLog.resource("User", user.id).metadata({ email: user.email }).step("Technician entity created");

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
      extraPermissions: technicianDto.extraPermissions,
      revokedPermissions: technicianDto.revokedPermissions,
    }),
  );

  // 12) Save allowedSpecializations
  if (technicianDto.allowedSpecializations?.length > 0) {
    await allowedSpecializationsRepo.save(
      technicianDto.allowedSpecializations.map((specId) =>
        allowedSpecializationsRepo.create({
          user,
          specialization: { id: specId } as any,
        }),
      ),
    );

    auditLog.step("Technician specializations assigned");

  }

  return { is_added: true, message: t("user_created") };
};

export const editTechnicianService = async (
  id: string,
  technicianDto: CreateTechnicianMapped,
  imageFile?: Express.Multer.File,
  req?: Request
): Promise<IEditResponse> => {
  const auditLog = audit(req);

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
    auditLog.step("Technician not found");
    return { is_edited: false, message: t("user_not_found"), errors: [] };
  }

  const oldValues = {
    email: userEntity.email,
    university: userEntity.university?.id,
    domain: userEntity.domain?.id,
    permissions: userEntity.usersPermissions?.map((up) => up.permissionProfile?.id),
    specializations: userEntity.allowedSpecializations?.map((s) => s.specialization.id),
    hasImage: !!userEntity.image,
  };

  // 2) Validate university + domain
  const entitiesResult = await validateEntities(
    technicianDto.university,
    technicianDto.domain,
  );

  if (!entitiesResult.is_valid) {
    auditLog.step("Invalid university/domain");

    return {
      is_edited: false,
      message: "",
      errors: entitiesResult.errors,
    };
  }

  const { university, domain } = entitiesResult;

  // 3) Validate permission profile + extra/revoked permissions
  const permResult = await validateExistingPermission(
    technicianDto.permissionProfile,
    technicianDto.extraPermissions,
    technicianDto.revokedPermissions,
  );

  if (!permResult.is_valid) {
    auditLog.step("Invalid permission configuration");

    return {
      is_edited: false,
      message: "",
      errors: permResult.errors,
    };
  }

  // 4) Validate allowed specializations
  const specsResult = await validateExistingSpecializations(
    technicianDto.allowedSpecializations,
  );

  if (!specsResult.is_valid) {
    auditLog.step("Invalid specializations");

    return {
      is_edited: false,
      message: "",
      errors: specsResult.errors,
    };
  }

  // 5) Force user type
  technicianDto.userType = UserType.TECHNICIAN;

  // 6) Map DTO → partial User and merge into existing entity
  const userData = await mapTechnicianToUserEntity(technicianDto);

  userRepo.merge(userEntity, userData);
  userEntity.university = university;
  userEntity.domain = domain;

  // 7) Handle image upload if exists
  if (imageFile) {
    // delete the old image

    deleteFile(process.env.MINIO_BUCKET, userEntity.image);

    const safeKey = await uploadFilesWithUniqueKey(
      IMAGE_PATHS.UsersImages,
      technicianDto.ssn,
      imageFile,
    );
    userEntity.image = safeKey;

    auditLog.step("User image updated");
  }

  // 8) Save updated user
  const user = await userRepo.save(userEntity);

  logger.info(`[server] [user] Editing user ${userEntity.email}`);

  // 9) Clear old relations and re-create them

  // 9.1) UsersPermissions – assume one row per user, so delete & recreate
  await usersPermissionsRepo.delete({ user: { id: user.id } as any });

  const profile = permResult.profile!;
  await usersPermissionsRepo.save(
    usersPermissionsRepo.create({
      user,
      permissionProfile: profile,
      extraPermissions: technicianDto.extraPermissions,
      revokedPermissions: technicianDto.revokedPermissions,
    }),
  );

  // 9.2) AllowedSpecializations – clear then add
  await allowedSpecializationsRepo.delete({ user: { id: user.id } as any });

  if (technicianDto.allowedSpecializations?.length > 0) {
    await allowedSpecializationsRepo.save(
      technicianDto.allowedSpecializations.map((specId) =>
        allowedSpecializationsRepo.create({
          user,
          specialization: { id: specId } as any,
        }),
      ),
    );
  }

  const newValues = {
    email: user.email,
    university: university?.id,
    domain: domain?.id,
    permissions: permResult.profile?.id,
    specializations: technicianDto.allowedSpecializations || [],
    hasImage: !!user.image,
  };

  auditLog.metadata({ oldValue: oldValues, newValue: newValues }).step("Technician updated");

  return { is_edited: true, message: t("user_edited") };
};

export const deleteTechnicianService = async (
  id: string,
  req?: Request
): Promise<IDeleteResponse> => {
  const auditLog = audit(req);

  const userRepo = PostgresDataSource.getRepository(User);

  // 0) Load existing user
  const userEntity = await userRepo.findOne({ where: { id } });

  if (!userEntity) {
    auditLog.step("Technician not found");

    return { is_deleted: false, message: t("user_not_found") };
  }

  // 1) Delete user (soft delete)
  // await userRepo.softDelete(id);
  userEntity.deletedAt = new Date();
  await userRepo.update(id, userEntity);

  auditLog.step("Technician soft-deleted");

  logger.info(`[server] [user] Deleted user ${userEntity.email}`);
  return { is_deleted: true, message: t("user_deleted") };
};
