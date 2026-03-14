import { ObjectId } from 'mongodb';
import { Entity, Column, Index, ObjectIdColumn } from 'typeorm';

@Entity('audit_actions')
export class AuditAction {
  @ObjectIdColumn()
  _id: ObjectId;

  /**
   * Fixed unique action key
   * Example: LOGIN_SUCCESS
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  key: string;

  /**
   * Localized name
   */
  @Column({ type: 'jsonb' })
  name: {
    en: string;
    ar: string;
  };
}
