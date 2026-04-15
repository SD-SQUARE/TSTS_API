import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from "typeorm";
import { Ticket } from "./Ticket.js";
import { User } from "./User.js";

@Entity({ name: "ticket_reviews" })
export class TicketReview {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "int" })
  rating: number;

  @Column({ type: "text", nullable: true })
  note?: string;

  @Column({ type: "int" })
  closeCycle: number;

  @ManyToOne(() => Ticket, (ticket) => ticket.reviews, {
    onDelete: "CASCADE",
  })
  ticket: any;

  @ManyToOne(() => User, { nullable: false })
  reviewer: any;

  @CreateDateColumn()
  createdAt: Date;
}
