import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { User } from "./User.js";

@Entity({ name: "ticket_final_report_history" })
export class TicketFinalReportHistory extends BaseEntity {
  @ManyToOne("TicketFinalReport", "history", {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "reportId" })
  report: any;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "actorId" })
  actor?: any | null;

  @Column({ type: "varchar", length: 50 })
  action: string;

  @Column({ type: "jsonb", nullable: true })
  payload?: Record<string, unknown> | null;
}
