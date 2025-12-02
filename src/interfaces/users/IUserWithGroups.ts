import { Group } from "../../entities/Group.js";
import { User } from "../../entities/User.js";

export interface IUserWithGroups extends User {
  groups: Group[];
}
