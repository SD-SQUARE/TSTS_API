import {
  Entity,
  Column,
  ManyToOne,
  Index,
} from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { CustomForm } from "./CustomForm.js";
import { User } from "./User.js";
import { Ticket } from "./Ticket.js";

@Entity({ name: "form_responses" })
export class FormResponse extends BaseEntity {
  @Column({ type: "jsonb" })
  data: any;

  @ManyToOne(() => CustomForm, (form) => form.responses, { onDelete: "CASCADE" })
  form: any;

  @Column({ type: "uuid" })
  formId: string;

  @ManyToOne(() => User, { nullable: true })
  responder: any | null;

  @Column({ type: "uuid", nullable: true })
  responderId: string | null;

  @ManyToOne(() => Ticket, { nullable: true, onDelete: "CASCADE" })
  ticket: any | null;

  @Column({ type: "uuid", nullable: true })
  ticketId: string | null;
}
