import {
  Entity,
  Column,
  OneToMany,
  Repository,
  SelectQueryBuilder,
} from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { AllowedSpecialization } from "./AllowedSpecialization.js";
import { GroupSpecialization } from "./GroupSpecialization.js";
import { Ticket } from "./Ticket.js";
import { Problem } from "./Problem.js";


export type SpecializationDto = {
  id: string;
  name_en: string;
  name_ar: string;
  description_en?: string;
  description_ar?: string;
  review_required: boolean;
};


type PaginatedResult<T> = {
  specializations: T[];
  meta_data: {
    total: number;
    page_index: number;
    page_size: number;
  };
};


@Entity({ name: "specializations" })
export class Specialization extends BaseEntity {
  @Column({ type: "jsonb" })
  name!: { en: string; ar: string };

  @Column({ type: "jsonb", nullable: true })
  description?: { en?: string; ar?: string };

  @Column({ type: "boolean", nullable: false, default: false })
  review_required!: boolean;

  @OneToMany(() => AllowedSpecialization, (as) => as.specialization, { lazy: true })
  allowed!: any[];

  @OneToMany(() => GroupSpecialization, (gs) => gs.specialization)
  groupSpecializations!: any[];

  @OneToMany(() => Ticket, (ticket) => ticket.specialization)
  tickets!: any[];
  @OneToMany(()=>Problem,(problem)=>problem.specialization)
  problems!:any[];

  
 toApi(): SpecializationDto {
  return {
    id: this.id,
    review_required: this.review_required,

    name_en: this.name?.en ,
    name_ar: this.name?.ar ,

    description_en: this.description?.en??"",
    description_ar: this.description?.ar??"",
  };
}

  static async paginate(
    page = 1,
    limit = 20,
    search?: string,
    repo?: Repository<Specialization>,
    includeAllowed = false,
    includeGroups = false
  ): Promise<PaginatedResult<SpecializationDto>> {
    if (!repo) {
      throw new Error(
        "Repository not provided. Pass AppDataSource.getRepository(Specialization)."
      );
    }

    page = Math.max(1, Math.floor(page));
    limit = Math.max(1, Math.min(200, Math.floor(limit)));

    const qb: SelectQueryBuilder<Specialization> =
      repo.createQueryBuilder("s");

    if (includeAllowed) {
      qb.leftJoinAndSelect("s.allowed", "allowed");
    }

    if (includeGroups) {
      qb.leftJoinAndSelect("s.groupSpecializations", "gs");
    }

    if (includeAllowed || includeGroups) {
      qb.distinct(true);
    }

    if (search) {
      const s = search.trim();
      if (s.length > 0) {
        const param = `%${s}%`;
        qb.andWhere(
          `(
            s.name->>'en' ILIKE :q OR s.name->>'ar' ILIKE :q
            OR (s.description->>'en') ILIKE :q
            OR (s.description->>'ar') ILIKE :q
          )`,
          { q: param }
        );
      }
    }

    if (repo.metadata.findColumnWithPropertyName("createdAt")) {
      qb.orderBy("s.createdAt", "DESC");
    } else {
      qb.orderBy("s.id", "DESC");
    }

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    const formattedData: SpecializationDto[] =
      data.map((d) => d.toApi());

    return {
      specializations: formattedData,
      meta_data: {
        total,
        page_index: page,
        page_size: limit,
      },
    };
  }
}
