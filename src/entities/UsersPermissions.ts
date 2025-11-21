// src/entities/UsersPermissions.ts
import { Entity, ManyToOne, Column } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { User } from "./User.js";
import { PermissionProfile } from "./PermissionProfile.js";

@Entity({ name: "users_permissions" })
export class UsersPermissions extends BaseEntity {
  @ManyToOne(() => User, (u) => u.usersPermissions, { onDelete: "CASCADE", lazy: true })
  user!: User;

  @ManyToOne(() => PermissionProfile, { onDelete: "SET NULL", nullable: true, lazy: true })
  permissionProfile?: PermissionProfile;

  // arrays stored as jsonb (list of uuids)
  @Column({ type: "jsonb", nullable: true })
  revokedPermissions?: string[];

  @Column({ type: "jsonb", nullable: true })
  extraPermissions?: string[];
}
