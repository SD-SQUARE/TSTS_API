// src/entities/Group.ts
import { Entity, Column, OneToMany } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { TechnicianGroup } from "./TechnicianGroup.js";
import { GroupHead } from "./GroupHead.js";
import { GroupSpecialization } from "./GroupSpecialization.js";
import { ChatMessage } from "./ChatMessage.js";
import { Team } from "./Team.js";

@Entity({ name: "groups" })
export class Group extends BaseEntity {
  @Column({ type: "jsonb", nullable: true })
  name?: { en?: string; ar?: string };

  @Column({ type: "jsonb", nullable: true })
  descriptions?: { en?: string; ar?: string };

  @Column({ type: "varchar", length: 255, nullable: true })
  color?: string;

  @OneToMany(() => TechnicianGroup, (tg) => tg.group, )
  technicians!: any[];

  @OneToMany(() => GroupHead, (gh) => gh.group, )
  heads!: any[];

  @OneToMany(() => GroupSpecialization, (gs) => gs.group, )
  specializations!: any[];

  @OneToMany(() => Team, (team) => team.group)
  teams!: any[];

  @OneToMany(() => ChatMessage, (msg) => msg.group)
  chat: any[];
}
