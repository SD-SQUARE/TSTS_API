import {
  Entity,
  Column,
  ManyToOne,
  Repository,
  SelectQueryBuilder,
  OneToMany,
} from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { Specialization } from "./Specialization.js";
import { Ticket } from "./Ticket.js";

export type ProblemDto = {
  id: string;
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;

  specialization: {
    id: string;
    name_en: string;
    name_ar: string;
    description_en?: string;
    description_ar?: string;
    review_required: boolean;
  };

  review_required: boolean;
};

type PaginatedResult<T> = {
  problems: T[];
  meta_data: {
    total: number;
    page_index: number;
    page_size: number;
  };
};

type ProblemFilters = {
  search?: string;
  name_en?: string;
  name_ar?: string;
  description_en?: string;
  description_ar?: string;
  specialization?: string;
  review_required?: string;
};

@Entity({ name: "problems" })
export class Problem extends BaseEntity {
  @Column({ type: "jsonb" })
  name!: { en: string; ar: string };

  @Column({ type: "jsonb", nullable: true })
  description?: { en?: string; ar?: string };

  @Column({ type: "boolean", nullable: false, default: false })
  review_required!: boolean;

  @ManyToOne(() => Specialization, (sp) => sp.problems, { nullable: false })
  specialization!: any;

  @OneToMany(() => Ticket, (t) => t.problem, { nullable: false })
  ticket!: any;

  toApi(): ProblemDto {
    return {
      id: this.id,
      name_en: this.name?.en,
      name_ar: this.name?.ar,
      description_en: this.description?.en ?? "",
      description_ar: this.description?.ar ?? "",
      specialization: {
        id: this.specialization.id,
        name_en: this.specialization.name.en,
        name_ar: this.specialization.name.ar,
        description_en: this.specialization.description?.en??"",
        description_ar: this.specialization.description?.en??"",
        review_required: this.specialization.review_required
      },
      review_required: this.review_required,
    };
  }

  static async paginate(
    page = 1,
    limit = 20,
    filters: ProblemFilters = {},
    repo?: Repository<Problem>,
  ): Promise<PaginatedResult<ProblemDto>> {
    if (!repo) {
      throw new Error("Repository not provided.");
    }

    page = Math.max(1, Math.floor(page));
    limit = Math.max(1, Math.min(200, Math.floor(limit)));

    const qb: SelectQueryBuilder<Problem> =
      repo.createQueryBuilder("p");

    // ✅ Always join specialization
    qb.leftJoinAndSelect("p.specialization", "s");

    if (filters.specialization) {
      qb.andWhere("s.id = :specId", { specId: filters.specialization });
    }

    if (filters.search) {
      const param = `%${filters.search.trim()}%`;
      qb.andWhere(
        `(
          p.name->>'en' ILIKE :q OR 
          p.name->>'ar' ILIKE :q OR
          p.description->>'en' ILIKE :q OR
          p.description->>'ar' ILIKE :q
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
      qb.andWhere(`COALESCE(p.description->>'en', '') ILIKE :descriptionEn`, {
        descriptionEn: `%${filters.description_en.trim()}%`,
      });
    }

    if (filters.description_ar?.trim()) {
      qb.andWhere(`COALESCE(p.description->>'ar', '') ILIKE :descriptionAr`, {
        descriptionAr: `%${filters.description_ar.trim()}%`,
      });
    }

    if (filters.review_required === "true" || filters.review_required === "false") {
      qb.andWhere(`p.review_required = :reviewRequired`, {
        reviewRequired: filters.review_required === "true",
      });
    }

    qb.orderBy("p.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      problems: data.map((d) => d.toApi()),
      meta_data: {
        total,
        page_index: page,
        page_size: limit,
      },
    };
  }
}
