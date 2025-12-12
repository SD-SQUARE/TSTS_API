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
} from "typeorm";
import { User } from "./User.js";
import { Specialization } from "./Specialization.js";
import { TicketStatus } from "../enums/TicketStatus.enum.js";
import { TicketPriority } from "../enums/TicketPriority.enum.js";
import { Media } from "./Media.js";
import { TicketListener } from "./TicketListener.js";
import { TicketActivity } from "./TicketActivity.js";
import { TicketChat } from "./TicketChat.js";

@Entity({ name: "tickets" })
export class Ticket {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 100 })
  title: string;

  @Column({ type: "text", length: 2000 })
  description: string;

  @ManyToOne(() => User, (user) => user.requestedTickets, { nullable: false })
  requester: User;

  @ManyToOne(() => Specialization, (spec) => spec.tickets, { nullable: true })
  specialization: Specialization | null;

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
  assigneeList: User[];

  @OneToMany(() => Media, (media) => media.ticket)
  media: Media[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  modifiedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @OneToMany(() => TicketListener, (listener) => listener.ticket)
  listeners: TicketListener[];

  @OneToMany(() => TicketActivity, (act) => act.ticket)
  activities: TicketActivity[];

  @OneToMany(() => TicketChat, (chat) => chat.ticket)
  chats: TicketChat[];
}
