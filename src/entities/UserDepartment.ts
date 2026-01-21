// src/entities/UserDepartment.ts
import { Entity, ManyToOne } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { User } from "./User.js";
import { Department } from "./Department.js";

@Entity({ name: "user_departments" })
export class UserDepartment extends BaseEntity {
  @ManyToOne(() => User, (u) => u.userDepartments, { onDelete: "CASCADE", lazy: true })
  user!: any;

  @ManyToOne(() => Department, (d) => d.userDepartments, {
    onDelete: "CASCADE",
    lazy: true,
  })
  department!: any;
}
