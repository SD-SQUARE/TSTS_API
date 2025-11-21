// src/entities/Specialization.ts
import { Entity, Column, ManyToMany, OneToMany } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { AllowedSpecialization } from "./AllowedSpecialization.js";
import { GroupSpecialization } from "./GroupSpecialization.js";

@Entity({ name: "specializations" })
export class Specialization extends BaseEntity {
  @Column({ type: "jsonb" })
  name!: { en: string; ar: string };

  @Column({ type: "jsonb", nullable: true })
  description?: { en?: string; ar?: string };

  @OneToMany(() => AllowedSpecialization, (as) => as.specialization, { lazy: true })
  allowed!: AllowedSpecialization[];

  @OneToMany(() => GroupSpecialization, (gs) => gs.specialization, { lazy: true })
  groupSpecializations!: GroupSpecialization[];
}
