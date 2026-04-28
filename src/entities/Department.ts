import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  Repository,
  SelectQueryBuilder,
} from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { Domain } from "./Domain.js";
import { UserDepartment } from "./UserDepartment.js";
import { normalizeRelations } from "../utils/normalizeRelations.js";
import { mapJsonFields } from "../utils/formatter.js";
type PaginatedResult<T> = {
  departments: T[];
  meta: {
    total: number;
    page_index: number;
    page_size: number;
  };
};

interface DepartmentFilter {
  page?: number;
  limit?: number;
  search?: string;
  name_en?: string;
  name_ar?: string;
  description_en?: string;
  description_ar?: string;
  domain?: string;
  university?: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Entity({ name: "departments" })
export class Department extends BaseEntity {
  @ManyToOne(() => Domain, (domain) => domain.departments, {
    onDelete: "CASCADE",
    lazy: true,
  })
  domain!: any;

  @Column({ type: "jsonb" })
  name!: { en: string; ar?: string };

  @Column({ type: "jsonb", nullable: true })
  description?: { en?: string; ar?: string };

  @OneToMany(() => UserDepartment, (ud) => ud.department, { lazy: true })
  userDepartments!: any[];

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
    filters: DepartmentFilter = {},
    repo?: Repository<Department>,
  ): Promise<PaginatedResult<Department>> {
    if (!repo) throw new Error("Repository not provided.");

    const page = Math.max(1, Math.floor(filters.page || 1));
    const limit = Math.max(1, Math.min(200, Math.floor(filters.limit || 20)));

    const qb: SelectQueryBuilder<Department> = repo.createQueryBuilder("dep");

    qb.leftJoinAndSelect("dep.domain", "dom");
    qb.leftJoinAndSelect("dom.university", "u");

    if (filters.search?.trim()) {
      qb.andWhere(
        `(
          dep.name->>'en' ILIKE :search OR
          dep.name->>'ar' ILIKE :search OR
          COALESCE(dep.description->>'en', '') ILIKE :search OR
          COALESCE(dep.description->>'ar', '') ILIKE :search OR
          dom.name->>'en' ILIKE :search OR
          dom.name->>'ar' ILIKE :search OR
          u.name->>'en' ILIKE :search OR
          u.name->>'ar' ILIKE :search
        )`,
        { search: `%${filters.search.trim()}%` },
      );
    }

    if (filters.name_en?.trim()) {
      qb.andWhere(`dep.name->>'en' ILIKE :nameEn`, {
        nameEn: `%${filters.name_en.trim()}%`,
      });
    }

    if (filters.name_ar?.trim()) {
      qb.andWhere(`dep.name->>'ar' ILIKE :nameAr`, {
        nameAr: `%${filters.name_ar.trim()}%`,
      });
    }

    if (filters.description_en?.trim()) {
      qb.andWhere(`COALESCE(dep.description->>'en', '') ILIKE :descriptionEn`, {
        descriptionEn: `%${filters.description_en.trim()}%`,
      });
    }

    if (filters.description_ar?.trim()) {
      qb.andWhere(`COALESCE(dep.description->>'ar', '') ILIKE :descriptionAr`, {
        descriptionAr: `%${filters.description_ar.trim()}%`,
      });
    }

    if (filters.domain?.trim()) {
      const domainFilter = filters.domain.trim();
      if (UUID_REGEX.test(domainFilter)) {
        qb.andWhere(`dom.id = :domainId`, { domainId: domainFilter });
      } else {
        qb.andWhere(
          `(dom.name->>'en' ILIKE :domain OR dom.name->>'ar' ILIKE :domain)`,
          { domain: `%${domainFilter}%` },
        );
      }
    }

    if (filters.university?.trim()) {
      const universityFilter = filters.university.trim();
      if (UUID_REGEX.test(universityFilter)) {
        qb.andWhere(`u.id = :universityId`, { universityId: universityFilter });
      } else {
        qb.andWhere(
          `(u.name->>'en' ILIKE :university OR u.name->>'ar' ILIKE :university)`,
          { university: `%${universityFilter}%` },
        );
      }
    }

    if (repo.metadata.findColumnWithPropertyName("createdAt")) {
      qb.orderBy("dep.createdAt", "DESC");
    } else {
      qb.orderBy("dep.id", "DESC");
    }

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    const formattedData = data.map((d) => d.toApi());
    const plain = JSON.parse(JSON.stringify(formattedData));
    const normalizedData = normalizeRelations(plain);

    return {
      departments: normalizedData,
      meta: {
        total,
        page_index: page,
        page_size: limit,
      },
    };
  }
}
