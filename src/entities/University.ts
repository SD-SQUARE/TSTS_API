import { Entity,  Column, OneToMany, Repository, SelectQueryBuilder,} from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { Domain } from "./Domain.js";

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
  domains!: Domain[];

  static async paginate(
  page = 1,
  limit = 20,
  search?: string,
  repo?: Repository<University>,
  includeDomains = false
): Promise<PaginatedResult<University>> {
  if (!repo) {
    throw new Error("Repository not provided. Pass AppDataSource.getRepository(University).");
  }

  page = Math.max(1, Math.floor(page));
  limit = Math.max(1, Math.min(200, Math.floor(limit)));

  const qb: SelectQueryBuilder<University> = repo.createQueryBuilder("u");

  if (search) {
    const s = search.trim();
    if (s.length > 0) {
      qb.where(`u.name->>'en' ILIKE :search OR u.name->>'ar' ILIKE :search`, { search: `%${s}%` });
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

  return {
    universities: data,
    meta: {
      total,
      page_index: page,
      page_size: limit,
    },
  };
}

}
