import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  Index,
} from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { User } from "./User.js";
import { Ticket } from "./Ticket.js";
import { FormResponse } from "./FormResponse.js";

@Entity({ name: "custom_forms" })
export class CustomForm extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "jsonb", default: [] })
  fields: any[];

  @Column({ type: "jsonb", default: {} })
  settings: Record<string, any>;

  @Column({ type: "boolean", default: false })
  isGlobal: boolean;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 100, unique: true })
  token: string;

  @ManyToOne(() => User, { nullable: false })
  creator: any;

  @Column({ type: "uuid", nullable: true })
  ticketId: string | null;

  @ManyToOne(() => Ticket, { nullable: true, onDelete: "CASCADE" })
  ticket: any | null;

  @OneToMany(() => FormResponse, (response) => response.form)
  responses: any[];
}
