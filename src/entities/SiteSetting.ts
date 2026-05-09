import { Column, Entity } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";

@Entity({ name: "site_settings" })
export class SiteSetting extends BaseEntity {
  @Column({ type: "varchar", length: 500, nullable: true })
  logoPath?: string | null;

  @Column({ type: "int", default: 60 })
  unassignedTicketAlertMinutes!: number;
}
