import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { Group } from "./Group.js";
import { TeamLead } from "./TeamLead.js";
import { TeamTechnician } from "./TeamTechnician.js";
import { ChatMessage } from "./ChatMessage.js";

@Entity({ name: "teams" })
export class Team extends BaseEntity {
  @Column({ type: "jsonb", nullable: true })
  name?: { en?: string; ar?: string };

  @ManyToOne(() => Group, (group) => group.teams, {
    onDelete: "CASCADE",
    nullable: false,
    lazy: true,
  })
  group!: any;

  @OneToMany(() => TeamLead, (lead) => lead.team)
  leads!: any[];

  @OneToMany(() => TeamTechnician, (member) => member.team)
  technicians!: any[];

  @OneToMany(() => ChatMessage, (message) => message.team)
  chat!: any[];
}
