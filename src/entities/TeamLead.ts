import { Entity, ManyToOne } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { Team } from "./Team.js";
import { User } from "./User.js";

@Entity({ name: "team_leads" })
export class TeamLead extends BaseEntity {
  @ManyToOne(() => Team, (team) => team.leads, {
    onDelete: "CASCADE",
    lazy: true,
  })
  team!: any;

  @ManyToOne(() => User, (user) => user.teamLeadAssignments, {
    onDelete: "CASCADE",
    lazy: false,
  })
  user!: any;
}
