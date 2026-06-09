import { Column, Entity } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";

@Entity({ name: "site_settings" })
export class SiteSetting extends BaseEntity {
  @Column({ type: "varchar", length: 500, nullable: true })
  logoPath?: string | null;

  @Column({ type: "int", default: 60 })
  unassignedTicketAlertMinutes!: number;

  // AI Assistant Configuration
  @Column({ type: "boolean", default: true })
  aiAssistantEnabled!: boolean;

  @Column({ type: "varchar", length: 255, nullable: true })
  aiModelName?: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  aiApiKey?: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  aiChatUrl?: string | null;
}
