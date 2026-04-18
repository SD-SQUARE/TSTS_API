import { Column, Entity, Index, ManyToOne } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";

@Entity({ name: "ticket_quick_messages" })
@Index(["user"])
export class TicketQuickMessage extends BaseEntity {
  @Column({ type: "varchar", length: 120 })
  title_en: string;

  @Column({ type: "text" })
  content_en: string;

  @Column({ type: "varchar", length: 120 })
  title_ar: string;

  @Column({ type: "text" })
  content_ar: string;

  @ManyToOne("User", undefined, { nullable: false, onDelete: "CASCADE" })
  user: any;
}
