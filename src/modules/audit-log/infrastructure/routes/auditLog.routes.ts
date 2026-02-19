import { Router } from 'express';
import { AuditLogController } from '../../interfaces/http/AuditLogController';
import { AuditLogPresenter } from '../../interfaces/presenters/AuditLogPresenter';

// Use cases
import { GetAuditLogs } from '../../application/use-cases/GetAuditLogs';
import { RecordAudit } from '../../application/use-cases/RecordAudit';

// Repository and service
import { AuditLogRepositoryImpl } from '../mongoose/AuditLogRepositoryImpl';
import { AuditLogServiceImpl } from '../mongoose/AuditLogServiceImpl';

// Middleware
import { authMiddleware } from '../../../../common/middleware/auth.middleware';
import { requireAdmin } from '../../../../common/middleware/rbac.middleware';

/**
 * Audit Log Routes (Infrastructure Layer)
 *
 * Manual dependency injection.
 * Also exports auditLogService for use by other module route files.
 *
 * GET /workspaces/:workspaceId/audit-logs  → Admin only
 */

const router = Router();

// 1. Repository
const auditLogRepo = new AuditLogRepositoryImpl();

// 2. Use cases
const recordAuditUC = new RecordAudit(auditLogRepo);
const getAuditLogsUC = new GetAuditLogs(auditLogRepo);

// 3. Service (exported for injection into other route files)
export const auditLogService = new AuditLogServiceImpl(recordAuditUC);

// 4. Controller
const presenter = new AuditLogPresenter();
const controller = new AuditLogController(getAuditLogsUC, presenter);

// 5. Routes
router.get(
    '/workspaces/:workspaceId/audit-logs',
    authMiddleware,
    requireAdmin,
    controller.getAuditLogs
);

export default router;
