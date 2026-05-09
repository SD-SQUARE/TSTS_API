import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";

@Entity({ name: "allowed_email_domains" })
@Index(["domain"], { unique: true })
export class AllowedEmailDomain extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  domain!: string;
}
