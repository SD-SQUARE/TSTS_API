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
  page_size?: number;
  departmentName?: string;
  domainName?: string;
  universityName?: string;
}

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
    const limit = Math.max(1, Math.min(200, Math.floor(filters.page_size || 20)));

    const qb: SelectQueryBuilder<Department> = repo.createQueryBuilder("dep");

    qb.leftJoinAndSelect("dep.domain", "dom");
    qb.leftJoinAndSelect("dom.university", "u");

    const conditions: string[] = [];
    const params: Record<string, any> = {};

    if (filters.departmentName) {
      conditions.push(
        `dep.name->>'en' ILIKE :departmentName OR dep.name->>'ar' ILIKE :departmentName`,
      );
      params.departmentName = `%${filters.departmentName}%`;
    }

    if (filters.domainName) {
      conditions.push(
        `dom.name->>'en' ILIKE :domainName OR dom.name->>'ar' ILIKE :domainName`,
      );
      params.domainName = `%${filters.domainName}%`;
    }

    if (filters.universityName) {
      conditions.push(
        `u.name->>'en' ILIKE :universityName OR u.name->>'ar' ILIKE :universityName`,
      );
      params.universityName = `%${filters.universityName}%`;
    }

    if (conditions.length > 0) {
      qb.andWhere(`(${conditions.join(" OR ")})`, params);
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
