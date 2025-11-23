import { In } from "typeorm";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { Permission, PermissionProfile } from "../entities/index.js";
import { t } from "i18next";

export type ValidateRequesterPermissionsResult = {
  is_valid: boolean;
  message?: string;
  errors?: { key: string; message: string }[]; // Array to hold specific errors
  profile?: PermissionProfile;
};

export const validateExistingPermission = async (
  profileId: string,
  extraPermissions?: string[],
  revokedPermissions?: string[]
): Promise<ValidateRequesterPermissionsResult> => {
  const profilePermissionsRepo =
    PostgresDataSource.getRepository(PermissionProfile);
  const permissionsRepo = PostgresDataSource.getRepository(Permission);

  // Initialize the errors array
  const errors: { key: string; message: string }[] = [];

  // 1) Check profile
  const profile = await profilePermissionsRepo.findOneBy({ id: profileId });

  if (!profile) {
    errors.push({
      key: "profile",
      message: t("profile_permission_not_found"),
    });
    return {
      is_valid: false,
      message: t("profile_permission_not_found"),
      errors,
    };
  }

  // 2) Check extra + revoked permissions
  const allPermissionIds = [
    ...(extraPermissions ?? []),
    ...(revokedPermissions ?? []),
  ];

  if (allPermissionIds.length > 0) {
    const existing = await permissionsRepo.findBy({
      id: In(allPermissionIds),
    });

    const existingIds = new Set(existing.map((p) => p.id));
    const missing = allPermissionIds.filter((id) => !existingIds.has(id));

    if (missing.length > 0) {
      errors.push({
        key: "permissions",
        message: "some_permissions_do_not_exist",
      });
    }
  }

  // If there were any errors, return them
  if (errors.length > 0) {
    return {
      is_valid: false,
      message: "some_permissions_invalid", // General message for permission issues
      errors,
    };
  }

  // If everything is valid, return the profile
  return {
    is_valid: true,
    profile,
  };
};
