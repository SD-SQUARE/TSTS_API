import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
} from "typeorm";
import { User } from "./User.js";
import { Media } from "./Media.js";
import { Ticket } from "./Ticket.js";

@Entity("ticket_chat_messages")
export class TicketChatMessage {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.messages, { eager: true })
  sender: any;

  @Column("text")
  message: string;

  @ManyToMany(() => Media)
  @JoinTable({ name: "ticket_chat_message_media" })
  attachments: any[];

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Ticket, (ticket) => ticket.chats, {
    onDelete: "CASCADE",
  })
  ticket: any;
}
