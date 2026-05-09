import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Generated,
  Index,
} from "typeorm";
import { User } from "./User.js";
import { Specialization } from "./Specialization.js";
import { TicketStatus } from "../enums/TicketStatus.enum.js";
import { TicketPriority } from "../enums/TicketPriority.enum.js";
import { Media } from "./Media.js";
import { TicketListener } from "./TicketListener.js";
import { TicketActivity } from "./TicketActivity.js";
import { TicketChat } from "./TicketChat.js";
import { TicketReview } from "./TicketReview.js";
import { Problem } from "./problem.js";

@Entity({ name: "tickets" })
export class Ticket {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ type: "int", generated: "increment", unique: true })
  @Generated("increment")
  ticket_number: number;

  @Column({ type: "varchar", length: 100 })
  title: string;

  @Column({ type: "text" })
  description: string;

  @ManyToOne(() => User, (user) => user.requestedTickets, { nullable: false })
  requester: any;

  @ManyToOne(() => Specialization, (spec) => spec.tickets, { nullable: true })
  specialization: any | null;

  @ManyToOne(() => Problem, (prop) => prop.ticket, { nullable: true })
  problem: any | null;

  @Column({ type: "enum", enum: TicketStatus, default: TicketStatus.OPEN })
  status: TicketStatus;

  @Column({ type: "enum", enum: TicketPriority, default: TicketPriority.NA })
  priority: TicketPriority;

  @Column({ type: "boolean", default: false })
  isOutOfService: boolean;

  @ManyToMany(() => User, { nullable: true })
  @JoinTable({
    name: "ticket_assignees",
    joinColumn: { name: "ticket_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "user_id", referencedColumnName: "id" },
  })
  assigneeList: any[];

  @OneToMany(() => Media, (media) => media.ticket)
  media: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  modifiedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @Column({ type: "timestamptz", nullable: true })
  unassignedAlertedAt?: Date | null;

  @OneToMany(() => TicketListener, (listener) => listener.ticket)
  listeners: any[];

  @OneToMany(() => TicketActivity, (act) => act.ticket)
  activities: any[];

  @OneToMany(() => TicketChat, (chat) => chat.ticket)
  chats: any[];

  @OneToMany(() => TicketReview, (review) => review.ticket)
  reviews: any[];

  // close count
  @Column({ type: "int", default: 0 }) 
  closeCount: number;

}
