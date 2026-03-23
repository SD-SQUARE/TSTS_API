import { DataSource } from 'typeorm';
import { auditActionsSeed } from './AuditActionsSeed.js';
import { AuditAction } from '../../../entities/mongo-entities/AuditAction.js';

export const seedAuditActions = async (dataSource: DataSource) => {
  const repo = dataSource.getMongoRepository(AuditAction);

  for (const action of auditActionsSeed) {
    const exists = await repo.findOneBy({ key: action.key });

    if (!exists) {
      const entity = repo.create(action);
      await repo.save(entity);
      console.log(`✅ Seeded: ${action.key}`);
    } else {
      console.log(`⏭️  Skipped (exists): ${action.key}`);
    }
  }

  console.log('🌱 Audit actions seeding complete.');
};