import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
} from "typeorm";
import { User } from "./User.js";
import { Notification } from "./Notification.js";

@Entity("notification_reads")
export class NotificationRead {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Notification, (notification) => notification.id, {
    onDelete: "CASCADE",
  })
  notification: Notification;

  @ManyToOne(() => User, (user) => user.notificationsRead, { eager: true })
  user: User;

  @Column({ type: "boolean", default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
