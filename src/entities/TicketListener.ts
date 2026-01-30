import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
} from "typeorm";
import { Ticket } from "./Ticket.js";
import { User } from "./User.js";

@Entity("ticket_listeners")
export class TicketListener {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.listeners, {
    onDelete: "CASCADE",
  })
  ticket: any;

  @ManyToOne(() => User, (user) => user.listenedTickets, { eager: true })
  user: any;

  @CreateDateColumn()
  createdAt: Date;
}
