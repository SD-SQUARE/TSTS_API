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
};

type PaginatedResult<T> = {
  profiles: T[];
  meta_data: {
    total: number;
    page_index: number;
    page_size: number;
  };
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
    search?: string,
    repo?: Repository<PermissionProfile>
  ): Promise<PaginatedResult<PermissionProfileDto>> {

    if (!repo) {
      repo = PostgresDataSource.getRepository(PermissionProfile);
    }

    page = Math.max(1, Math.floor(page));
    limit = Math.max(1, Math.min(200, Math.floor(limit)));

    const qb: SelectQueryBuilder<PermissionProfile> =
      repo.createQueryBuilder("p");

    if (search) {
      const param = `%${search.trim()}%`;

      qb.andWhere(
        `(
          p.name->>'en' ILIKE :q OR
          p.name->>'ar' ILIKE :q 
        )`,
        { q: param }
      );
    }

    qb.orderBy("p.createdAt", "DESC")
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
    };
  }
}