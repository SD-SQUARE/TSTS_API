import { PostgresDataSource } from "../database/postgres-data-source.js";
import { UsersPermissions } from "../entities/UsersPermissions.js";

export class UsersPermissionsRepo {
  private repo = PostgresDataSource.getRepository(UsersPermissions);
  public getRepository() {
    return this.repo;
  }
 public async getPermissionsOfUser(
  userId: string,
  skip: number,
  take: number,
  name?: string
) {
  const qb = this.repo
    .createQueryBuilder("users_permissions")
    .leftJoinAndSelect("users_permissions.permissionProfile", "permission_profile")
    .leftJoinAndSelect("permission_profile.permissions", "profile_permissions")

    .leftJoinAndSelect("users_permissions.permissions", "user_permissions")
    .leftJoinAndSelect("users_permissions.extraPermissions", "extra_permissions")
    .leftJoinAndSelect("users_permissions.revokedPermissions", "revoked_permissions")

    .where("users_permissions.userId = :userId", { userId })
    .andWhere("users_permissions.deletedAt IS NULL");

  if (name) {
    qb.andWhere(
      `(permission_profile.name->>'en' ILIKE :name OR permission_profile.name->>'ar' ILIKE :name)`,
      { name: `%${name}%` }
    );
  }

  qb.skip(skip).take(take);

  const rows = await qb.getMany();

  return rows.map((item: any) => {
    const profile = item.__permissionProfile__ || item.permissionProfile;

    const profilePermissions = profile?.permissions || [];
    const userPermissions = item.permissions || [];
    const extraPermissions = item.extraPermissions || [];
    const revokedPermissions = item.revokedPermissions || [];

    const userPermissionKeys = new Set(userPermissions.map((p: any) => p.key));
    const revokedKeys = new Set(revokedPermissions.map((p: any) => p.key));

    let finalPermissions;

    if (
      profilePermissions.length === userPermissions.length &&
      profilePermissions.every((p: any) => userPermissionKeys.has(p.key))
    ) {
      finalPermissions = profilePermissions;
    } else {
      finalPermissions = profilePermissions.filter((p: any) =>
        userPermissionKeys.has(p.key)
      );
    }
    finalPermissions = finalPermissions.filter(
      (p: any) => !revokedKeys.has(p.key)
    );

    finalPermissions = [...finalPermissions, ...extraPermissions];

    return {
      id: profile?.id,
      name_en: profile?.name?.en,
      name_ar: profile?.name?.ar,
      description_en: profile?.descriptions?.en,
      description_ar: profile?.descriptions?.ar,

      permissions: finalPermissions.map((p: any) => ({
        key: p.key,
        name_en: p.name?.en,
        name_ar: p.name?.ar,
      })),
    };
  });
}
}