// src/entities/Domain.ts
import { Entity, Column, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { University } from "./University.js";
import { Department } from "./Department.js";

@Entity({ name: "domains" })
export class Domain extends BaseEntity {
  @ManyToOne(() => University, (u) => u.domains, { onDelete: "CASCADE", lazy: true })
  university!: University;

  @Column({ type: "jsonb" })
  name!: { en: string; ar: string };

  @Column({ type: "jsonb", nullable: true })
  description?: { en?: string; ar?: string };

  @OneToMany(() => Department, (d) => d.domain, { lazy: true })
  departments!: Department[];
}
