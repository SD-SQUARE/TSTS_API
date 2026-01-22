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
import { mapJsonFields } from "../utils/formatter.js";
import { Ticket } from "./Ticket.js";

type PaginatedResult<T> = {
  specializations: T[];
  meta: {
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

  @OneToMany(() => AllowedSpecialization, (as) => as.specialization, { lazy: true })
  allowed!: any[];

  @OneToMany(() => GroupSpecialization, (gs) => gs.specialization)
  groupSpecializations!: any[];

  @OneToMany(() => Ticket, (ticket) => ticket.specialization)
  tickets: any[];

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
    repo?: Repository<Specialization>,
    includeAllowed = false,
    includeGroups = false
  ): Promise<PaginatedResult<Specialization>> {
    if (!repo) {
      throw new Error(
        "Repository not provided. Pass AppDataSource.getRepository(Specialization)."
      );
    }

    page = Math.max(1, Math.floor(page));
    limit = Math.max(1, Math.min(200, Math.floor(limit)));

    const qb: SelectQueryBuilder<Specialization> = repo.createQueryBuilder("s");

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
            OR (s.description->>'en') ILIKE :q OR (s.description->>'ar') ILIKE :q
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

    const formattedData = data.map((d) => d.toApi());
    return {
      specializations: formattedData,
      meta: {
        total,
        page_index: page,
        page_size: limit,
      },
    };
  }
}
