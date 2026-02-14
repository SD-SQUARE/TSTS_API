import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from "typeorm";
import { Ticket } from "./Ticket.js";
import { User } from "./User.js";

@Entity({ name: "ticket_reviews" })
@Index(["ticket", "closeCycle"], { unique: true }) // 🔒 1 review per close
export class TicketReview {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "int" })
  rating: number; // 1–5

  @Column({ type: "text", nullable: true })
  note?: string;

  // Which "close number" this review belongs to
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
