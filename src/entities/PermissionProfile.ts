import { Entity, Column, Repository, SelectQueryBuilder, ManyToMany, JoinTable } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { PostgresDataSource } from "../database/postgres-data-source.js";
import { Permission } from "./index.js";

export type PermissionProfileDto = {
  id: string;
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  permissions?: Array<{
    key: string;
    name_en: string;
    name_ar: string;
  }>;
};

type PaginatedResult<T> = {
  profiles: T[];
  meta_data: {
    total: number;
    page_index: number;
    page_size: number;
  };
};

type PermissionProfileFilters = {
  search?: string;
  name_en?: string;
  name_ar?: string;
  description_en?: string;
  description_ar?: string;
  permission_name?: string;
};

@Entity({ name: "permission_profile" })
export class PermissionProfile extends BaseEntity {

  @Column({ type: "jsonb" })
  name!: { en: string; ar: string };

  @Column({ type: "jsonb", nullable: true })
  descriptions?: { en?: string; ar?: string };

   @ManyToMany(() => Permission, (permission) => permission.profiles, { cascade: true })
  @JoinTable({
    name: "permission_profile_permissions",
    joinColumn: { name: "permissionProfileId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "permissionId", referencedColumnName: "id" },
  })
  permissions!: Permission[];


  static async paginate(
    page = 1,
    limit = 20,
    filters: PermissionProfileFilters = {},
    repo?: Repository<PermissionProfile>
  ): Promise<PaginatedResult<PermissionProfileDto>> {

    if (!repo) {
      repo = PostgresDataSource.getRepository(PermissionProfile);
    }

    page = Math.max(1, Math.floor(page));
    limit = Math.max(1, Math.min(200, Math.floor(limit)));

    const qb: SelectQueryBuilder<PermissionProfile> =
      repo.createQueryBuilder("p");
    qb.leftJoinAndSelect("p.permissions", "permission");

    if (filters.search) {
      const param = `%${filters.search.trim()}%`;

      qb.andWhere(
        `(
          p.name->>'en' ILIKE :q OR
          p.name->>'ar' ILIKE :q 
        )`,
        { q: param }
      );
    }

    if (filters.name_en?.trim()) {
      qb.andWhere(`p.name->>'en' ILIKE :nameEn`, {
        nameEn: `%${filters.name_en.trim()}%`,
      });
    }

    if (filters.name_ar?.trim()) {
      qb.andWhere(`p.name->>'ar' ILIKE :nameAr`, {
        nameAr: `%${filters.name_ar.trim()}%`,
      });
    }

    if (filters.description_en?.trim()) {
      qb.andWhere(`COALESCE(p.descriptions->>'en', '') ILIKE :descriptionEn`, {
        descriptionEn: `%${filters.description_en.trim()}%`,
      });
    }

    if (filters.description_ar?.trim()) {
      qb.andWhere(`COALESCE(p.descriptions->>'ar', '') ILIKE :descriptionAr`, {
        descriptionAr: `%${filters.description_ar.trim()}%`,
      });
    }

    if (filters.permission_name?.trim()) {
      qb.andWhere(
        `(
          permission.name->>'en' ILIKE :permissionName OR
          permission.name->>'ar' ILIKE :permissionName OR
          permission.key ILIKE :permissionName
        )`,
        {
          permissionName: `%${filters.permission_name.trim()}%`,
        },
      );
    }

    qb.orderBy("p.createdAt", "DESC")
      .distinct(true)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      profiles: data.map((d) => d.toApi()),
      meta_data: {
        total,
        page_index: page,
        page_size: limit,
      },
    };
  }

  toApi(): PermissionProfileDto {
    return {
      id: this.id,
      name_en: this.name?.en,
      name_ar: this.name?.ar,
      description_en: this.descriptions?.en,
      description_ar: this.descriptions?.ar,
      permissions: this.permissions?.map((permission) => ({
        key: permission.key ?? "",
        name_en: permission.name?.en ?? "",
        name_ar: permission.name?.ar ?? "",
      })),
    };
  }
}
