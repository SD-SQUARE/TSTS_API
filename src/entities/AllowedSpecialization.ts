// src/entities/AllowedSpecialization.ts
import { Entity, ManyToOne } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { User } from "./User.js";
import { Specialization } from "./Specialization.js";

@Entity({ name: "allowed_specializations" })
export class AllowedSpecialization extends BaseEntity {
  @ManyToOne(() => User, (u) => u.allowedSpecializations, {
    onDelete: "CASCADE",
    lazy: true,
  })
  user!: any;

  @ManyToOne(() => Specialization, (s) => s.allowed, { onDelete: "CASCADE", lazy: true })
  specialization!: any;
}
