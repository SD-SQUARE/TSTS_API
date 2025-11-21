// src/entities/Department.ts
import { Entity, Column, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { Domain } from "./Domain.js";
import { UserDepartment } from "./UserDepartment.js";

@Entity({ name: "departments" })
export class Department extends BaseEntity {
  @ManyToOne(() => Domain, (domain) => domain.departments, {
    onDelete: "CASCADE",
    lazy: true,
  })
  domain!: Domain;

  @Column({ type: "jsonb" })
  name!: { en: string; ar: string };

  @Column({ type: "jsonb", nullable: true })
  description?: { en?: string; ar?: string };

  @OneToMany(() => UserDepartment, (ud) => ud.department, { lazy: true })
  userDepartments!: UserDepartment[];
}
