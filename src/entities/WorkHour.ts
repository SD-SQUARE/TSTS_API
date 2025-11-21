// src/entities/WorkHour.ts
import { Entity, Column, ManyToOne } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { UserStatus } from "../enums/UserStatus.enum.js";


@Entity({ name: "work_hours" })
export class WorkHour extends BaseEntity {
  
  @Column({ type: "time" })
  startTime!: string;

  @Column({ type: "time" })
  endTime!: string;
  @Column({ type: "enum", enum: UserStatus, default: UserStatus.ACTIVE })
  status!: UserStatus;
}
