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
import { Group } from "./Group.js";
import { Media } from "./Media.js";

@Entity("chat_messages")
export class ChatMessage {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.messages, { eager: true })
  sender: User;

  @Column("text")
  content: string;

  // Only one of these should be set per message
  @ManyToOne(() => Group, (group) => group.id, { nullable: true })
  group?: Group; // Group chat

  @ManyToOne(() => User, { nullable: true })
  recipient?: User; // Personal 1:1 chat
  
  @Column({ type: "boolean", default: false })
  isRead: boolean;

  @ManyToMany(() => Media)
  @JoinTable({ name: "chat_message_media" })
  attachments: Media[];

  @CreateDateColumn()
  createdAt: Date;
}
