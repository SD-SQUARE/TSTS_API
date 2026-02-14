import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from "typeorm";
import { User } from "./User.js";

export type DeviceType = "desktop" | "mobile" | "tablet";

@Entity("trusted_devices")
@Index(["user", "credentialId"], { unique: true })
export class TrustedDevice {
  
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.trustedDevices, {
    onDelete: "CASCADE",
  })
  user: any | User;

  @Column({ type: "varchar" })
  name: string; // editable (Work Laptop)

  @Column({
    type: "enum",
    enum: ["desktop", "mobile", "tablet"],
  })
  deviceType: DeviceType;

  @Column({ type: "varchar" })
  browser!: string;

  @Column({ type: "varchar" })
  os!: string;

  @Column({ unique: true, type: "varchar" })
  credentialId!: string;

  @Column({ type: "bytea" })
  publicKey!: Buffer;

  @Column({ type: "int", default: 0 })
  counter!: number;

  @Column({ default: true, type: "boolean" })
  isActive: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  activatedSince: Date;
    credentialPublicKeyCose: any;

  @Column({ type: "varchar" })
  ipAddress: string;
}
