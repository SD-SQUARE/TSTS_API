// src/entities/TechnicianGroup.ts
import { Entity, ManyToOne } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { Group } from "./Group.js";
import { User } from "./User.js";

@Entity({ name: "technician_groups" })
export class TechnicianGroup extends BaseEntity {
  @ManyToOne(() => User, (u) => u.technicianGroups, { onDelete: "CASCADE", lazy: false })
  user!: User;

  @ManyToOne(() => Group, (g) => g.technicians, { onDelete: "CASCADE", lazy: true })
  group!: Group;
}
