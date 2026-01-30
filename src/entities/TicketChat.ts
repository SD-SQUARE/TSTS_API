import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from "typeorm";
import { Ticket } from "./Ticket.js";
import { User } from "./User.js";

@Entity()
export class TicketChat {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("text")
  message: string;

  @ManyToOne(() => User, (user) => user.chats, { eager: true })
  sender: any;

  @ManyToOne(() => Ticket, (ticket) => ticket.chats, {
    onDelete: "CASCADE",
  })
  ticket: any;

  @CreateDateColumn()
  createdAt: Date;
}
