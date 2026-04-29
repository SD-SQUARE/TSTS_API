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
import { Team } from "./Team.js";

@Entity("chat_messages")
export class ChatMessage {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.messages, { eager: true })
  sender: any;

  @Column("text")
  content: string;

  // Only one of these should be set per message
  @ManyToOne(() => Group, (group) => group.id, { nullable: true })
  group?: any; // Group chat

  @ManyToOne(() => Team, (team) => team.id, { nullable: true })
  team?: any; // Team chat

  @ManyToOne(() => User, { nullable: true })
  recipient?: any; // Personal 1:1 chat
  
  @Column({ type: "boolean", default: false })
  isRead: boolean;

  @ManyToMany(() => Media)
  @JoinTable({ name: "chat_message_media" })
  attachments: any[];

  @CreateDateColumn()
  createdAt: Date;
}
