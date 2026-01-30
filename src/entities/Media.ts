import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from "typeorm";
import { Ticket } from "./Ticket.js";

@Entity({ name: "media" })
export class Media {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "varchar" })
  url: string;

  @Column({ type: "varchar" })
  mime: string;

  @ManyToOne(() => Ticket, (ticket) => ticket.media, {
    nullable: true,
    onDelete: "CASCADE",
  })
  ticket: any;

  @CreateDateColumn()
  createdAt: Date;
}
