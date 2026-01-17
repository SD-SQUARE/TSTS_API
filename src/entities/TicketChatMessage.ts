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

@Entity("ticket_chat_messages")
export class TicketChatMessage {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.messages, { eager: true })
  sender: User;

  @Column("text")
  message: string;

  @ManyToMany(() => Media)
  @JoinTable({ name: "ticket_chat_message_media" })
  attachments: Media[];

  @CreateDateColumn()
  createdAt: Date;
}
