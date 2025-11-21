// src/entities/PermissionProfile.ts
import { Entity, Column } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";

@Entity({ name: "permission_profile" })
export class PermissionProfile extends BaseEntity {
  // store permission ids (array of uuids) in jsonb to keep it flexible
  @Column({ type: "jsonb", default: [] })
  permissionIds!: string[];

  @Column({ type: "jsonb" })
  name!: { en: string; ar: string };

  @Column({ type: "jsonb", nullable: true })
  descriptions?: { en?: string; ar?: string };
}
