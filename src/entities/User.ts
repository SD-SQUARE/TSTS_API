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
import { Group } from "./Group.js";
import { Ticket } from "./Ticket.js";
import { TicketChat } from "./TicketChat.js";
import { TicketListener } from "./TicketListener.js";
import { NotificationRead } from "./NotificationRead.js";
import { ChatMessage } from "./ChatMessage.js";

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
  university?: any;

  @ManyToOne(() => Domain, { nullable: true, lazy: true })
  domain?: any;

  @Column({ type: "varchar", length: 255, nullable: true })
  refreshToken?: string;

  @Column({ type: "enum", enum: UserStatus, default: UserStatus.INACTIVE })
  status!: UserStatus;

  @Column({ type: "jsonb", nullable: true })
  job?: { en?: string; ar?: string };

  @OneToMany(() => TechnicianGroup, (tg) => tg.user, )
  technicianGroups!: any[];

  @OneToMany(() => AllowedSpecialization, (as) => as.user, { lazy: true })
  allowedSpecializations!: any[];

  @OneToMany(() => GroupHead, (gh) => gh.user, )
  groupHeads!: any[];

  @OneToMany(() => UsersPermissions, (up) => up.user, { lazy: true })
  usersPermissions!: any[];

  @OneToMany(() => UserDepartment, (ud) => ud.user, { lazy: true })
  userDepartments!: any[];

  @OneToMany(() => Group, (g) => g.teamLeader)
  ledGroups!: any[];

  @OneToMany(() => Ticket, (ticket) => ticket.requester)
  requestedTickets: any[];

  @OneToMany(() => TicketChat, (chat) => chat.sender)
  chats: any[];

  @OneToMany(() => TicketListener, (listener) => listener.user)
  listenedTickets: any[];

  @OneToMany(() => NotificationRead, (read) => read.user)
  notificationsRead: any[];

  @OneToMany(() => ChatMessage, (msg) => msg.sender)
  messages: any[];
}
