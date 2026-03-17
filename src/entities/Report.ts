import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Repository,
} from "typeorm";

@Entity("reports")
@Index(["handler"])
export class Report {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * Handler function name for this report (unique identifier)
   */
  @Column({ type: "varchar", unique: true })
  handler: string;

  /**
   * Report title in both languages
   */
  @Column({ type: "jsonb" })
  title: { en?: string; ar?: string };

  /**
   * Report description in both languages
   */
  @Column({ type: "jsonb", nullable: true })
  description?: { en?: string; ar?: string };

  /**
   * Full-text search vector for title and description
   */
  @Column({
    type: "tsvector",
    nullable: true,
    select: false,
    insert: false,
    update: false,
  })
  searchVector?: string;

  /**
   * Dynamic column definitions returned to frontend.
   * Backend defines column order and meaning.
   */
  @Column({ type: "jsonb", nullable: true })
  columns?: Array<{
    key: string;
    label: { en?: string; ar?: string };
  }>;

  /**
   * Allowed equality filters for this report.
   * Only "=" is supported.
   */
  @Column({ type: "jsonb", nullable: true })
  filters?: Array<{
    column: string;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Paginate and search reports with full-text search and pattern matching
   */
  static async paginateAndSearch(
    repo: Repository<Report>,
    options: {
      search?: string;
      page?: number;
      limit?: number;
      language?: "en" | "ar";
    },
  ) {
    const page = Math.max(options.page || 1, 1);
    const limit = Math.min(options.limit || 10, 100);
    const offset = (page - 1) * limit;
    const lang = options.language || "en";

    const qb = repo
      .createQueryBuilder("report")
      .select([
        "report.id",
        "report.handler",
        "report.title",
        "report.description",
        "report.columns",
        "report.filters",
        "report.createdAt",
        "report.updatedAt",
      ]);

    // 🔍 Search across title and description in both languages
    if (options.search?.trim()) {
      qb.andWhere(
        `(
          report.searchVector @@ websearch_to_tsquery('english', :search)
          OR report.title->>'en' ILIKE :like
          OR report.title->>'ar' ILIKE :like
          OR report.description->>'en' ILIKE :like
          OR report.description->>'ar' ILIKE :like
        )`,
        {
          search: options.search,
          like: `%${options.search}%`,
        },
      );
    }

    qb.skip(offset).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
