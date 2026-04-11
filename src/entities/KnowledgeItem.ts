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
  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "varchar", length: 1000 })
  description: string;

  @Column({ type: "varchar", length: 100 })
  specialization: string;

  @Column({ type: "varchar", nullable: true, length: 200000 })
  content?: string;

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

    // 🔍 Search across ALL fields
    if (options.search?.trim()) {
      qb.andWhere(
        `(
        item.searchVector @@ websearch_to_tsquery('english', :search)
        OR item.title ILIKE :like
        OR item.description ILIKE :like
        OR item.specialization ILIKE :like
        OR item.content ILIKE :like
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