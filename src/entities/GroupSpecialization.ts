// src/entities/GroupSpecialization.ts
import { Entity, Index, ManyToOne } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { Group } from "./Group.js";
import { Specialization } from "./Specialization.js";

@Entity({ name: "group_specializations" })
export class GroupSpecialization extends BaseEntity {
  @Index("IDX_group_specializations_groupId")
  @ManyToOne(() => Group, (g) => g.specializations, { onDelete: "CASCADE",})
  group!: any;

  @Index("IDX_group_specializations_specializationId")
  @ManyToOne(() => Specialization, (s) => s.groupSpecializations, {
    onDelete: "CASCADE",
  })
  specialization!: any;
}
