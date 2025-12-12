// src/entities/Group.ts
import {
  Entity,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { TechnicianGroup } from "./TechnicianGroup.js";
import { GroupHead } from "./GroupHead.js";
import { GroupSpecialization } from "./GroupSpecialization.js";
import { User } from "./User.js";
import { ChatMessage } from "./ChatMessage.js";

@Entity({ name: "groups" })
export class Group extends BaseEntity {
  @Column({ type: "jsonb", nullable: true })
  name?: { en?: string; ar?: string };

  @Column({ type: "jsonb", nullable: true })
  descriptions?: { en?: string; ar?: string };

  @Column({ type: "varchar", length: 255, nullable: true })
  color?: string;

  @OneToMany(() => TechnicianGroup, (tg) => tg.group)
  technicians!: TechnicianGroup[];

  @OneToMany(() => GroupHead, (gh) => gh.group)
  heads!: GroupHead[];

  @OneToMany(() => GroupSpecialization, (gs) => gs.group)
  specializations!: GroupSpecialization[];

  @ManyToOne(() => User, { nullable: true, lazy: true })
  @JoinColumn({ name: "teamLeaderId" })
  teamLeader?: User;

  @OneToMany(() => ChatMessage, (msg) => msg.group)
  chat: ChatMessage[];
}
