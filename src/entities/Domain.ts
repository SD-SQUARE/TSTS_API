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

@Entity({ name: "domains" })
export class Domain extends BaseEntity {
  @ManyToOne(() => University, (u) => u.domains, { onDelete: "CASCADE", lazy: true })
  university!: University;

  @Column({ type: "jsonb" })
  name!: { en: string; ar: string };

  @Column({ type: "jsonb", nullable: true })
  description?: { en?: string; ar?: string };

  @OneToMany(() => Department, (d) => d.domain, { lazy: true })
  departments!: Department[];

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
  repo?: Repository<Domain>,
  universityName?: string 
): Promise<PaginatedResult<Domain>> {
  if (!repo) {
    throw new Error("Repository not provided. Pass AppDataSource.getRepository(Domain).");
  }

  page = Math.max(1, Math.floor(page));
  limit = Math.max(1, Math.min(200, Math.floor(limit)));

  const qb: SelectQueryBuilder<Domain> = repo.createQueryBuilder("d");
  qb.leftJoinAndSelect("d.university", "u");

  if (universityName) {
    const uniName = universityName.trim();
    if (uniName.length > 0) {
      qb.andWhere(`u.name->>'en' ILIKE :uname OR u.name->>'ar' ILIKE :uname`, { uname: `%${uniName}%` });
    }
  }

  if (search) {
    const s = search.trim();
    if (s.length > 0) {
      qb.where(`d.name->>'en' ILIKE :search OR d.name->>'ar' ILIKE :search`, { search: `%${s}%` });
    }
  }

  if (repo.metadata.findColumnWithPropertyName("createdAt") !== undefined) {
    qb.orderBy("d.createdAt", "DESC");
  } else {
    qb.orderBy("d.id", "DESC");
  }

  qb.skip((page - 1) * limit).take(limit);

  const [data, total] = await qb.getManyAndCount();

  const formatted = data.map((d) => d.toApi());
  const domains = formatted.map(d => {
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
