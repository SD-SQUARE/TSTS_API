import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 150 })
  name_en: string;

  @Column({ type: "varchar", length: 150 })
  name_ar: string;

  @Column({ type: "varchar", unique: true, length: 255 })
  email: string;

  @Column({ type: "varchar", length: 255 })
  password: string;
}
