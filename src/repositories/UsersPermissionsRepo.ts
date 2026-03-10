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
  .leftJoinAndSelect("permission_profile.permissions", "permissions")
  .where("users_permissions.userId = :userId", { userId })
  .andWhere("users_permissions.deletedAt IS NULL");

if (name) {
  qb.andWhere(
    `(permission_profile.name->>'en' ILIKE :name OR permission_profile.name->>'ar' ILIKE :name)`,
    { name: `%${name}%` }
  );
}
  qb.skip(skip).take(take);

  const profiles = await qb.getMany();

  return profiles.map((item: any) => {
    const profile = item.__permissionProfile__ || item.permissionProfile;

    return {
      id: profile?.id,
      name_en: profile?.name?.en,
      name_ar: profile?.name?.ar,
      description_en: profile?.descriptions?.en,
      description_ar: profile?.descriptions?.ar,
      permissions: (profile?.permissions || []).map((p: any) => ({
        key: p.key,
        name_en: p.name?.en,
        name_ar: p.name?.ar,
      })),
    };
  });
}
}