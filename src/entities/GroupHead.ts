// src/entities/GroupHead.ts
import { Entity, ManyToOne } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { Group } from "./Group.js";
import { User } from "./User.js";

@Entity({ name: "group_heads" })
export class GroupHead extends BaseEntity {
  @ManyToOne(() => Group, (g) => g.heads, { onDelete: "CASCADE", lazy: true })
  group!: any;

  @ManyToOne(() => User, (u) => u.groupHeads, { onDelete: "CASCADE", lazy: false })
  user!: any;
}
