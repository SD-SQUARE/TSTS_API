import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";
import { NotificationType } from "../enums/NotificationType.enum.js";

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "enum", enum: NotificationType })
  type: NotificationType;

  @Column({ type: "text" })
  title: string;

  @Column({ type: "text", nullable: true })
  content: string;

  @Column({ type: "uuid", nullable: true })
  ticketId?: string;

  @Column({ type: "uuid", nullable: true })
  chatMessageId?: string;

  @Column({ type: "uuid", nullable: true })
  extraReference?: string;

  @CreateDateColumn()
  createdAt: Date;
}
