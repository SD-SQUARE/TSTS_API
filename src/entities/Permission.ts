import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToMany, AfterInsert, Index } from "typeorm";
import { PermissionProfile } from "./PermissionProfile.js";
import { PostgresDataSource } from "../database/postgres-data-source.js"; // هنا DataSource

@Entity({ name: "permissions" })
export class Permission {

  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 100, nullable: true })
  key!: string;

  @Column({ type: "jsonb", nullable: true })
  name?: { en?: string; ar?: string };

  @ManyToMany(() => PermissionProfile, (profile) => profile.permissions)
  profiles!: PermissionProfile[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
