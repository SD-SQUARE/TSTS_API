// src/entities/University.ts
import { Entity, Column, OneToMany } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { Domain } from "./Domain.js";

@Entity({ name: "universities" })
export class University extends BaseEntity {
  @Column({ type: "jsonb" })
  name!: { en: string; ar: string };

  @Column({ type: "jsonb", nullable: true })
  description?: { en?: string; ar?: string };

  @OneToMany(() => Domain, (d) => d.university, { lazy: true })
  domains!: Domain[];
}
