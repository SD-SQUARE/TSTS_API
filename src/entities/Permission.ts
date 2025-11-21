// src/entities/Permission.ts
import { Entity, Column } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";

@Entity({ name: "permissions" })
export class Permission extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  code!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  category?: string;

  @Column({ type: "jsonb", nullable: true })
  error?: { en?: string; ar?: string };

  @Column({ type: "jsonb", nullable: true })
  description?: { en?: string; ar?: string };
}
