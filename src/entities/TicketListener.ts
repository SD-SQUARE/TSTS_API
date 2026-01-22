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
  ticket: Ticket;

  @ManyToOne(() => User, (user) => user.listenedTickets, { eager: true })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
