import { Entity, ObjectIdColumn, Column } from 'typeorm';
import { ObjectId } from 'mongodb';

export type AuditActor = {
  id?: string;
  type?: string;
  ipAddress?: string;
  userAgent?: string;
  full_name?: string;
};

export type AuditResource = {
  type: string;
  id: string;
};

export type AuditStep = {
  time: Date;
  action: string;
};

export type AuditStatus = 'SUCCESS' | 'FAILED';

@Entity()
export class AuditLog {
  @ObjectIdColumn()
  _id: ObjectId;

  @Column({ type: 'string', nullable: true })
  summary: string;

  @Column({ type: 'json', nullable: true })
  actor: AuditActor;

  @Column({ type: 'string', nullable: true })
  action: string;

  @Column({ type: 'json', nullable: true })
  resource?: AuditResource;

  @Column({ type: 'string' })
  status: AuditStatus;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'json' })
  steps: AuditStep[];

  @Column({ type: 'date' })
  createdAt: Date;

  @Column({ type: 'date' })
  finishedAt: Date;
}
