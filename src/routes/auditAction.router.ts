import { Router } from 'express';
import { listAuditLogsController } from '../controllers/auditAction.controller.js';

const router = Router();
router.get('/', listAuditLogsController);

export default router;