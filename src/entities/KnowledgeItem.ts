import {
  Entity,
  Column,
  Repository,
  Index,
} from "typeorm";
import { BaseEntity } from "./BaseEntity.js";

@Entity({ name: "knowledge_items" })
@Index(["specialization_en"])
export class KnowledgeItem extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  title_en: string;

  @Column({ type: "varchar", length: 255 })
  title_ar: string;

  @Column({ type: "varchar", length: 1000 })
  description_en: string;

  @Column({ type: "varchar", length: 1000 })
  description_ar: string;

  @Column({ type: "varchar", length: 100 })
  specialization_en: string;

  @Column({ type: "varchar", length: 100 })
  specialization_ar: string;

  @Column({ type: "varchar", nullable: true, length: 200000 })
  content_en?: string;

  @Column({ type: "varchar", nullable: true, length: 200000 })
  content_ar?: string;

  @Column({
    name: "search_vector",
    type: "tsvector",
    nullable: true,
    select: false,
    insert: false,
    update: false,
  })
  searchVector: string;

  static async paginateAndSearch(
    repo: Repository<KnowledgeItem>,
    options: {
      search?: string;
      category?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(options.page || 1, 1);
    const limit = Math.min(options.limit || 10, 100);
    const offset = (page - 1) * limit;

    const qb = repo
      .createQueryBuilder("item")
      .select([
        "item.id",
        "item.title_en",
        "item.title_ar",
        "item.description_en",
        "item.description_ar",
        "item.specialization_en",
        "item.specialization_ar",
        "item.content_en",
        "item.content_ar",
        "item.createdAt",
        "item.updatedAt",
      ])
      .where("item.deletedAt IS NULL");

    if (options.search?.trim()) {
      qb.andWhere(
        `(
          item.searchVector @@ websearch_to_tsquery('simple', :search)
          OR item.title_en ILIKE :like
          OR item.title_ar ILIKE :like
          OR item.description_en ILIKE :like
          OR item.description_ar ILIKE :like
          OR item.specialization_en ILIKE :like
          OR item.specialization_ar ILIKE :like
          OR item.content_en ILIKE :like
          OR item.content_ar ILIKE :like
        )`,
        {
          search: options.search,
          like: `%${options.search}%`,
        }
      );
    }

    if (options.category?.trim()) {
      qb.andWhere(
        "(item.specialization_en = :category OR item.specialization_ar = :category)",
        { category: options.category.trim() },
      );
    }

    qb
      .orderBy("item.updatedAt", "DESC")
      .skip(offset)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: {
        total,
        page,
        limit,
      },
    };
  }
}
