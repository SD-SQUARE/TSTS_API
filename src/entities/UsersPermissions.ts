import { Entity, ManyToOne ,ManyToMany,JoinTable, JoinColumn} from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { User } from "./User.js";
import { PermissionProfile } from "./PermissionProfile.js";
import { Permission } from "./Permission.js";

@Entity({ name: "users_permissions" })
export class UsersPermissions extends BaseEntity {
  @ManyToOne(() => User, (u) => u.usersPermissions, { onDelete: "CASCADE", lazy: true })
  @JoinColumn({ name: "userId" })
  user!: any;

  @ManyToOne(() => PermissionProfile, { onDelete: "SET NULL", nullable: true, lazy: true })
  permissionProfile?: any;
     
  @ManyToMany(() => Permission)
  @JoinTable({
    name: "users_activated_permissions",
  })
  permissions?: any[];
  
  @ManyToMany(() => Permission)
  @JoinTable({
    name: "users_permissions_extra",
  })
  extraPermissions?: any[];

  @ManyToMany(() => Permission)
  @JoinTable({
    name: "users_permissions_revoked",
  })
  revokedPermissions?: any[];
  
}