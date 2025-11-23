// src/entities/User.ts
import { Entity, Column, OneToMany, ManyToOne, Index, Unique } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { TechnicianGroup } from "./TechnicianGroup.js";
import { AllowedSpecialization } from "./AllowedSpecialization.js";
import { GroupHead } from "./GroupHead.js";
import { UsersPermissions } from "./UsersPermissions.js";
import { UserDepartment } from "./UserDepartment.js";
import { University } from "./University.js";
import { Domain } from "./Domain.js";
import { UserStatus } from "../enums/UserStatus.enum.js";
import { UserType } from "../enums/UserType.enum.js";

@Entity({ name: "users" })
@Unique(["email"])
export class User extends BaseEntity {
  @Column({ type: "varchar", length: 255, nullable: false })
  email!: string;

  @Column({ type: "varchar", length: 255, nullable: false })
  password!: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  image?: string;

  // merge first_name_en/first_name_ar into one jsonb
  @Column({ type: "jsonb", nullable: true })
  firstName?: { en?: string; ar?: string };

  @Column({ type: "jsonb", nullable: true })
  midName?: { en?: string; ar?: string };

  @Column({ type: "jsonb", nullable: true })
  lastName?: { en?: string; ar?: string };

  @Column({ type: "varchar", length: 14, nullable: true })
  ssn?: string;

  @Column({ type: "enum", enum: UserType, nullable: true })
  user_type?: UserType;

  // contacts as jsonb: { mobile: [".."], phone: [".."] } or arbitrary json
  @Column({ type: "jsonb", nullable: true })
  contacts?: { mobile?: string[]; phone?: string[] };

  @ManyToOne(() => University, (u) => u.domains, { nullable: true, lazy: true })
  university?: University;

  @ManyToOne(() => Domain, { nullable: true, lazy: true })
  domain?: Domain;

  @Column({ type: "varchar", length: 255, nullable: true })
  refreshToken?: string;

  @Column({ type: "enum", enum: UserStatus, default: UserStatus.INACTIVE })
  status!: UserStatus;

  @Column({ type: "jsonb", nullable: true })
  job?: { en?: string; ar?: string };

  @OneToMany(() => TechnicianGroup, (tg) => tg.user, { lazy: true })
  technicianGroups!: TechnicianGroup[];

  @OneToMany(() => AllowedSpecialization, (as) => as.user, { lazy: true })
  allowedSpecializations!: AllowedSpecialization[];

  @OneToMany(() => GroupHead, (gh) => gh.user, { lazy: true })
  groupHeads!: GroupHead[];

  @OneToMany(() => UsersPermissions, (up) => up.user, { lazy: true })
  usersPermissions!: UsersPermissions[];

  @OneToMany(() => UserDepartment, (ud) => ud.user, { lazy: true })
  userDepartments!: UserDepartment[];
}
