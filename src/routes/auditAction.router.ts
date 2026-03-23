import { Router } from 'express';
import {
  getAuditLogByIdController,
  listAuditLogsController,
} from '../controllers/auditAction.controller.js';

const router = Router();
router.get('/', listAuditLogsController).get('/:id', getAuditLogByIdController);

export default router;
