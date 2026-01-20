// src/entities/BaseEntity.ts
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  BaseEntity as TypeORMBase,
  DeleteDateColumn,
} from "typeorm";

export abstract class BaseEntity extends TypeORMBase {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;

  @DeleteDateColumn({ type: "timestamptz", nullable: true })
  deletedAt?: Date | null;
}
