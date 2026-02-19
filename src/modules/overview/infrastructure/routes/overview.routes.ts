import { Router } from 'express';
import { OverviewController } from '../../interfaces/http/OverviewController';
import { GetWorkspaceOverview } from '../../application/use-cases/GetWorkspaceOverview';

// Repository implementations
import { EntityRepositoryImpl } from '../../../entity/infrastructure/mongoose/EntityRepositoryImpl';
import { DocumentRepositoryImpl } from '../../../document/infrastructure/mongoose/DocumentRepositoryImpl';
import { DocumentTypeRepositoryImpl } from '../../../document-type/infrastructure/mongoose/DocumentTypeRepositoryImpl';
import { WorkItemRepositoryImpl } from '../../../work-item/infrastructure/mongoose/WorkItemRepositoryImpl';
import { WorkItemTypeRepositoryImpl } from '../../../work-item/infrastructure/mongoose/WorkItemTypeRepositoryImpl';

// Middleware
import { authMiddleware } from '../../../../common/middleware/auth.middleware';
import { requireMember } from '../../../../common/middleware/rbac.middleware';

/**
 * Overview Routes (Infrastructure Layer)
 *
 * GET /workspaces/:workspaceId/overview  → Member+ access
 */

const router = Router();

// 1. Repository implementations
const entityRepo = new EntityRepositoryImpl();
const documentRepo = new DocumentRepositoryImpl();
const documentTypeRepo = new DocumentTypeRepositoryImpl();
const workItemRepo = new WorkItemRepositoryImpl();
const workItemTypeRepo = new WorkItemTypeRepositoryImpl();

// 2. Use case
const getOverviewUC = new GetWorkspaceOverview(
    entityRepo,
    documentRepo,
    documentTypeRepo,
    workItemRepo,
    workItemTypeRepo
);

// 3. Controller
const controller = new OverviewController(getOverviewUC);

// 4. Routes
router.get(
    '/workspaces/:workspaceId/overview',
    authMiddleware,
    requireMember,
    controller.getOverview
);

export default router;
