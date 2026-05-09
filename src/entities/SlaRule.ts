import { Column, Entity, ManyToOne } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { University } from "./University.js";
import { Domain } from "./Domain.js";
import { Specialization } from "./Specialization.js";
import { Problem } from "./problem.js";

@Entity({ name: "sla_rules" })
export class SlaRule extends BaseEntity {
  @Column({ type: "jsonb" })
  name!: { en?: string; ar?: string };

  @ManyToOne(() => University, { nullable: true, lazy: true })
  university?: any | null;

  @ManyToOne(() => Domain, { nullable: true, lazy: true })
  domain?: any | null;

  @ManyToOne(() => Specialization, { nullable: true, lazy: true })
  specialization?: any | null;

  @ManyToOne(() => Problem, { nullable: true, lazy: true })
  problem?: any | null;

  @Column({ type: "int" })
  maxHours!: number;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;
}
