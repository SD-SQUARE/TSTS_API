import {
  Entity,
  Column,
  Repository,
  Index,
} from "typeorm";
import { BaseEntity } from "./BaseEntity.js";

@Entity({ name: "knowledge_items" })
@Index(["specialization"])
export class KnowledgeItem extends BaseEntity {

  @Column({ type: "jsonb" })
  title!: {
    en: string;
    ar: string;
  };

  @Column({ type: "jsonb" })
  description!: {
    en: string;
    ar: string;
  };

  @Column({ type: "jsonb" })
  specialization!: {
    en: string;
    ar: string;
  };

  @Column({ type: "jsonb", nullable: true })
  content?: {
    en?: string;
    ar?: string;
  };

  @Column({
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
      page?: number;
      page_size?: number;
    }
  ) {
    const page = Math.max(options.page || 1, 1);
    const limit = Math.min(options.page_size || 10, 100);
    const offset = (page - 1) * limit;

    const qb = repo
      .createQueryBuilder("item")
      .select([
        "item.id",
        "item.title",
        "item.description",
        "item.specialization",
        "item.content",
        "item.createdAt",
        "item.updatedAt",
      ])
      .where("item.deletedAt IS NULL");

    if (options.search?.trim()) {
      qb.andWhere(
        `(
      item.searchVector @@ websearch_to_tsquery('simple', :search)

      OR ((item.title::jsonb ->> 'en') || ' ' || (item.title::jsonb ->> 'ar')) ILIKE :like

      OR ((item.description::jsonb ->> 'en') || ' ' || (item.description::jsonb ->> 'ar')) ILIKE :like

      OR ((item.specialization::jsonb ->> 'en') || ' ' || (item.specialization::jsonb ->> 'ar')) ILIKE :like

      OR ((item.content::jsonb ->> 'en') || ' ' || (item.content::jsonb ->> 'ar')) ILIKE :like
    )`,
        {
          search: options.search,
          like: `%${options.search}%`,
        }
      );
    }

    qb.skip(offset).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: {
        total,
        page,
        page_size: limit,
      },
    };
  }
}