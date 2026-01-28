import { Entity,  Column, OneToMany, Repository, SelectQueryBuilder,} from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { Domain } from "./Domain.js";
import { mapJsonFields } from "../utils/formatter.js";

type PaginatedResult<T> = {
  universities: T[];
  meta: {
    total: number;
    page_index: number;
    page_size: number;
  };
};

@Entity({ name: "universities" })
export class University extends BaseEntity {
  @Column({ type: "jsonb" })
  name!: { en: string; ar: string };

  @Column({ type: "jsonb", nullable: true })
  description?: { en?: string; ar?: string };

  @OneToMany(() => Domain, (d) => d.university, { lazy: true })
  domains!: any[];

  toApi() {
    return {
      ...this,
      ...mapJsonFields(this.name, { fields: { name_en: "en", name_ar: "ar" } }),
      ...mapJsonFields(this.description ?? {}, {
        fields: { description_en: "en", description_ar: "ar" },
      }),
    };
  }
  static async paginate(
    page = 1,
    limit = 20,
    search?: string,
    repo?: Repository<University>,
    includeDomains = false
  ): Promise<PaginatedResult<University>> {
    if (!repo) {
      throw new Error(
        "Repository not provided. Pass AppDataSource.getRepository(University)."
      );
    }

    page = Math.max(1, Math.floor(page));
    limit = Math.max(1, Math.min(200, Math.floor(limit)));

    const qb: SelectQueryBuilder<University> = repo.createQueryBuilder("u");

    if (search) {
      const s = search.trim();
      if (s.length > 0) {
        qb.where(`u.name->>'en' ILIKE :search OR u.name->>'ar' ILIKE :search`, {
          search: `%${s}%`,
        });
      }
    }

    if (includeDomains) {
      qb.leftJoinAndSelect("u.domains", "d").distinct(true);
    }

    if (repo.metadata.findColumnWithPropertyName("createdAt") !== undefined) {
      qb.orderBy("u.createdAt", "DESC");
    } else {
      qb.orderBy("u.id", "DESC");
    }

    qb.skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();

    
    const universities = data.map((u) => u.toApi());
    return {
      universities: universities,
      meta: {
        total,
        page_index: page,
        page_size: limit,
      },
    };
  }
}
