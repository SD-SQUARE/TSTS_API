// src/entities/GroupSpecialization.ts
import { Entity, ManyToOne } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { Group } from "./Group.js";
import { Specialization } from "./Specialization.js";

@Entity({ name: "group_specializations" })
export class GroupSpecialization extends BaseEntity {
  @ManyToOne(() => Group, (g) => g.specializations, { onDelete: "CASCADE",})
  group!: any;

  @ManyToOne(() => Specialization, (s) => s.groupSpecializations, {
    onDelete: "CASCADE",
  })
  specialization!: any;
}
