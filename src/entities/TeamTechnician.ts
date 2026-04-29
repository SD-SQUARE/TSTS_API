import { Entity, ManyToOne } from "typeorm";
import { BaseEntity } from "./BaseEntity.js";
import { Team } from "./Team.js";
import { User } from "./User.js";

@Entity({ name: "team_technicians" })
export class TeamTechnician extends BaseEntity {
  @ManyToOne(() => Team, (team) => team.technicians, {
    onDelete: "CASCADE",
    lazy: true,
  })
  team!: any;

  @ManyToOne(() => User, (user) => user.teamTechnicianAssignments, {
    onDelete: "CASCADE",
    lazy: false,
  })
  user!: any;
}
