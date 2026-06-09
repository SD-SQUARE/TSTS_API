import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";

@Entity({ name: "api_keys" })
@Index(["keyPrefix"], { unique: true })
@Index(["keyHash"], { unique: true })
export class ApiKey extends BaseEntity {
  @Column({ type: "varchar", length: 150 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description?: string | null;

  @Column({ type: "varchar", length: 24 })
  keyPrefix!: string;

  @Column({ type: "varchar", length: 128 })
  keyHash!: string;

  @Column({ type: "jsonb", default: () => "'[]'::jsonb" })
  zones!: string[];

  @Column({ type: "jsonb", default: () => "'[]'::jsonb" })
  methods!: string[];

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "timestamptz", nullable: true })
  expiresAt?: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  lastUsedAt?: Date | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  lastUsedIp?: string | null;

  @Column({ type: "uuid", nullable: true })
  createdById?: string | null;
}
