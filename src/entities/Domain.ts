import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  Repository,
  SelectQueryBuilder,
} from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { University } from "./University.js";
import { Department } from "./Department.js";
import { mapJsonFields } from "../utils/formatter.js";

type PaginatedResult<T> = {
  domains: T[];
  meta: {
    total: number;
    page_index: number;
    page_size: number;
  };
};

type DomainFilters = {
  search?: string;
  name_en?: string;
  name_ar?: string;
  description_en?: string;
  description_ar?: string;
  university?: string;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Entity({ name: "domains" })
export class Domain extends BaseEntity {
  @ManyToOne(() => University, (u) => u.domains, {
    onDelete: "CASCADE",
    lazy: true,
  })
  university!: any;

  @Column({ type: "jsonb" })
  name!: { en: string; ar: string };

  @Column({ type: "jsonb", nullable: true })
  description?: { en?: string; ar?: string };

  @OneToMany(() => Department, (d) => d.domain, { lazy: true })
  departments!: any[];

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
    filters: DomainFilters = {},
    repo?: Repository<Domain>,
  ): Promise<PaginatedResult<Domain>> {
    if (!repo) {
      throw new Error(
        "Repository not provided. Pass AppDataSource.getRepository(Domain).",
      );
    }

    page = Math.max(1, Math.floor(page));
    limit = Math.max(1, Math.min(200, Math.floor(limit)));

    const qb: SelectQueryBuilder<Domain> = repo.createQueryBuilder("d");
    qb.leftJoinAndSelect("d.university", "u");

    if (filters.university) {
      const uniName = filters.university.trim();
      if (uniName.length > 0) {
        if (UUID_REGEX.test(uniName)) {
          qb.andWhere(`u.id = :universityId`, {
            universityId: uniName,
          });
        } else {
          qb.andWhere(
            `(u.name->>'en' ILIKE :uname OR u.name->>'ar' ILIKE :uname)`,
            { uname: `%${uniName}%` },
          );
        }
      }
    }

    if (filters.search) {
      const s = filters.search.trim();
      if (s.length > 0) {
        qb.andWhere(
          `(
            d.name->>'en' ILIKE :search OR
            d.name->>'ar' ILIKE :search OR
            COALESCE(d.description->>'en', '') ILIKE :search OR
            COALESCE(d.description->>'ar', '') ILIKE :search
          )`,
          {
            search: `%${s}%`,
          },
        );
      }
    }

    if (filters.name_en?.trim()) {
      qb.andWhere(`d.name->>'en' ILIKE :nameEn`, {
        nameEn: `%${filters.name_en.trim()}%`,
      });
    }

    if (filters.name_ar?.trim()) {
      qb.andWhere(`d.name->>'ar' ILIKE :nameAr`, {
        nameAr: `%${filters.name_ar.trim()}%`,
      });
    }

    if (filters.description_en?.trim()) {
      qb.andWhere(`COALESCE(d.description->>'en', '') ILIKE :descriptionEn`, {
        descriptionEn: `%${filters.description_en.trim()}%`,
      });
    }

    if (filters.description_ar?.trim()) {
      qb.andWhere(`COALESCE(d.description->>'ar', '') ILIKE :descriptionAr`, {
        descriptionAr: `%${filters.description_ar.trim()}%`,
      });
    }

    if (repo.metadata.findColumnWithPropertyName("createdAt") !== undefined) {
      qb.orderBy("d.createdAt", "DESC");
    } else {
      qb.orderBy("d.id", "DESC");
    }

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    const formatted = data.map((d) => d.toApi());
    const domains = formatted.map((d) => {
      const plain = JSON.parse(JSON.stringify(d));
      if (plain.__university__ !== undefined) {
        plain.university = plain.__university__;
        delete plain.__university__;
      }
      return plain;
    });

    return {
      domains,
      meta: {
        total,
        page_index: page,
        page_size: limit,
      },
    };
  }
}
