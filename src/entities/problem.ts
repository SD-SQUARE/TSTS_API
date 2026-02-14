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
  specialization: string;
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

@Entity({ name: "problems" })
export class Problem extends BaseEntity {
  @Column({ type: "jsonb" })
  name!: { en: string; ar: string };

  @Column({ type: "jsonb", nullable: true })
  description?: { en?: string; ar?: string };

  @Column({ type: "boolean", nullable: false, default: false })
  review_required!: boolean;

  // ✅ Removed lazy:true
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
      specialization: this.specialization?.id,
      review_required: this.review_required,
    };
  }

  static async paginate(
    page = 1,
    limit = 20,
    search?: string,
    repo?: Repository<Problem>,
    specializationId?: string
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

    if (specializationId) {
      qb.andWhere("s.id = :specId", { specId: specializationId });
    }

    if (search) {
      const param = `%${search.trim()}%`;
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
