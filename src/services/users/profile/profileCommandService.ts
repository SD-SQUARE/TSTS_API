import { In } from "typeorm";
import { t } from "i18next";
import { PostgresDataSource } from "../../../database/postgres-data-source.js";
import { User } from "../../../entities/User.js";
import { UserType } from "../../../enums/UserType.enum.js";
import { IMAGE_PATHS } from "../../../constants/imagePathes.js";
import { uploadFilesWithUniqueKey } from "../../../helpers/ImagesHelper.js";
import { deleteFile } from "../../../utils/storage.js";

const userRepo = PostgresDataSource.getRepository(User);

const ADMIN_ROLES = [UserType.ADMIN, UserType.SUPER_ADMIN];

const isAdminRole = (role?: string) => ADMIN_ROLES.includes(role as UserType);

const mapRoleSegmentToUserTypes = (role: string) => {
  switch ((role || "").toLowerCase()) {
    case "admins":
      return [UserType.ADMIN, UserType.SUPER_ADMIN];
    case "technicians":
      return [UserType.TECHNICIAN];
    case "requesters":
      return [UserType.REQUESTER];
    default:
      return null;
  }
};

export const ensureUserCanEditProfileFields = async (
  targetUserId: string,
  actor?: { id?: string; role?: string },
) => {
  if (!actor?.id) {
    return {
      allowed: false,
      statusCode: 401,
      message: t("auth.user_not_authenticated"),
    };
  }

  if (actor.role === UserType.SUPER_ADMIN) {
    return { allowed: true };
  }

  if (actor.id !== targetUserId) {
    if (isAdminRole(actor.role)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      statusCode: 403,
      message: t("auth.permissions_error"),
    };
  }

  const user = await userRepo.findOne({
    where: { id: targetUserId },
    select: ["id", "allowProfileEdit"],
  });

  if (!user) {
    return {
      allowed: false,
      statusCode: 404,
      message: t("user_not_found"),
    };
  }

  if (user.allowProfileEdit) {
    return { allowed: true };
  }

  return {
    allowed: false,
    statusCode: 403,
    message: t("profile_edit_not_allowed"),
  };
};

export const updateProfileImageService = async (
  targetUserId: string,
  imageFile: Express.Multer.File,
  actor?: { id?: string; role?: string },
) => {
  if (!actor?.id) {
    return {
      is_updated: false,
      statusCode: 401,
      message: t("auth.user_not_authenticated"),
    };
  }

  if (actor.id !== targetUserId && !isAdminRole(actor.role)) {
    return {
      is_updated: false,
      statusCode: 403,
      message: t("auth.permissions_error"),
    };
  }

  const user = await userRepo.findOne({
    where: { id: targetUserId },
    select: ["id", "image", "ssn"],
  });

  if (!user) {
    return {
      is_updated: false,
      statusCode: 404,
      message: t("user_not_found"),
    };
  }

  if (user.image) {
    deleteFile(process.env.MINIO_BUCKET, user.image);
  }

  user.image = await uploadFilesWithUniqueKey(
    IMAGE_PATHS.UsersImages,
    user.ssn || user.id,
    imageFile,
  );

  await userRepo.save(user);

  return {
    is_updated: true,
    statusCode: 200,
    message: t("profile_image_updated"),
  };
};

export const updateUserProfileEditAccessService = async (
  userId: string,
  allowProfileEdit: boolean,
) => {
  const user = await userRepo.findOne({
    where: { id: userId },
    select: ["id", "allowProfileEdit"],
  });

  if (!user) {
    return {
      is_updated: false,
      statusCode: 404,
      message: t("user_not_found"),
    };
  }

  user.allowProfileEdit = allowProfileEdit;
  await userRepo.save(user);

  return {
    is_updated: true,
    statusCode: 200,
    message: t("profile_edit_access_updated"),
  };
};

export const updateRoleProfileEditAccessService = async (
  role: string,
  allowProfileEdit: boolean,
) => {
  const userTypes = mapRoleSegmentToUserTypes(role);

  if (!userTypes?.length) {
    return {
      is_updated: false,
      statusCode: 400,
      message: t("invalid_input"),
    };
  }

  const result = await userRepo.update(
    {
      user_type: In(userTypes),
      deletedAt: null,
    },
    {
      allowProfileEdit,
    },
  );

  return {
    is_updated: true,
    statusCode: 200,
    message: t("profile_edit_access_role_updated"),
    affected: result.affected ?? 0,
  };
};
