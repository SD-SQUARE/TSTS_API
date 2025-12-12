import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { Ticket } from "./Ticket.js";
import { TicketActivityType } from "../enums/TicketActivity.enum.js";

@Entity("ticket_activities")
export class TicketActivity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.activities, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "ticket_id" })
  ticket: Ticket;

  @Column({
    type: "enum",
    enum: TicketActivityType,
  })
  type: TicketActivityType;

  @Column({ type: "varchar", length: 150 })
  title: string;

  @Column({ type: "text" })
  content: string;

  @Column({ type: "json", nullable: true })
  meta: any;

  @CreateDateColumn()
  createdAt: Date;
}
