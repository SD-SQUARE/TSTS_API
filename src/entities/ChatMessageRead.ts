import {
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { ChatMessage } from "./ChatMessage.js";
import { User } from "./User.js";

@Entity("chat_message_reads")
@Unique("UQ_chat_message_reads_message_user", ["message", "user"])
export class ChatMessageRead {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => ChatMessage, { onDelete: "CASCADE" })
  message: any;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  user: any;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
