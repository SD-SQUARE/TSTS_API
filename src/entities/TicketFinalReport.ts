import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { BaseEntity } from "./BaseEntity.js";

export type TicketFinalReportKnowledgeDraft = {
  title_en?: string;
  title_ar?: string;
  description_en?: string;
  description_ar?: string;
  specialization_en?: string;
  specialization_ar?: string;
  content_en?: string;
  content_ar?: string;
};

@Entity({ name: "ticket_final_reports" })
@Index("IDX_ticket_final_reports_ticket_unique", ["ticket"], { unique: true })
export class TicketFinalReport extends BaseEntity {
  @ManyToOne("Ticket", { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "ticketId" })
  ticket: any;

  @ManyToOne("User", { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "authorId" })
  author: any;

  @Column({ type: "varchar", length: 255, nullable: true })
  title_en?: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  title_ar?: string | null;

  @Column({ type: "text", nullable: true })
  content_en?: string | null;

  @Column({ type: "text", nullable: true })
  content_ar?: string | null;

  @Column({ type: "jsonb", nullable: true })
  knowledgeDraft?: TicketFinalReportKnowledgeDraft | null;

  @Column({ type: "uuid", nullable: true })
  publishedKnowledgeItemId?: string | null;

  @Column({ type: "timestamptz", nullable: true })
  publishedAt?: Date | null;

  @OneToMany("Media", "finalReport")
  attachments?: any[];

  @OneToMany("TicketFinalReportHistory", "report")
  history?: any[];
}
