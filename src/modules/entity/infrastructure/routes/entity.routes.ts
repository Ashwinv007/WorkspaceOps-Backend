import { Router } from 'express';
import { EntityController } from '../../interfaces/http/EntityController';
import { EntityPresenter } from '../../interfaces/presenters/EntityPresenter';

// Use cases
import { CreateEntity } from '../../application/use-cases/CreateEntity';
import { GetEntities } from '../../application/use-cases/GetEntities';
import { UpdateEntity } from '../../application/use-cases/UpdateEntity';
import { DeleteEntity } from '../../application/use-cases/DeleteEntity';

// Repository implementations
import { EntityRepositoryImpl } from '../mongoose/EntityRepositoryImpl';
import { WorkspaceRepositoryImpl } from '../../../workspace/infrastructure/mongoose/WorkspaceRepositoryImpl';

// Audit log service (cross-cutting)
import { auditLogService } from '../../../audit-log/infrastructure/routes/auditLog.routes';

// Middleware
import { authMiddleware } from '../../../../common/middleware/auth.middleware';
import { requireAdmin, requireMember } from '../../../../common/middleware/rbac.middleware';

/**
 * Entity Routes (Infrastructure Layer)
 * 
 * Manual dependency injection for entity module.
 * 1. Create repository implementations
 * 2. Inject into use cases
 * 3. Inject use cases into controller
 * 4. Wire up Express routes with middleware
 */

const router = Router();

// 1. Create repository implementations
const entityRepo = new EntityRepositoryImpl();
const workspaceRepo = new WorkspaceRepositoryImpl();

// 2. Create use cases with injected dependencies
const createEntityUseCase = new CreateEntity(
    entityRepo,
    workspaceRepo,
    auditLogService
);

const getEntitiesUseCase = new GetEntities(
    entityRepo
);

const updateEntityUseCase = new UpdateEntity(
    entityRepo,
    auditLogService
);

const deleteEntityUseCase = new DeleteEntity(
    entityRepo,
    auditLogService
);

// 3. Create presenter
const presenter = new EntityPresenter();

// 4. Create controller with injected use cases
const entityController = new EntityController(
    createEntityUseCase,
    getEntitiesUseCase,
    updateEntityUseCase,
    deleteEntityUseCase,
    presenter
);

// 5. Define routes with authentication and authorization middleware
// All routes are nested under /workspaces/:workspaceId/entities
router.post(
    '/workspaces/:workspaceId/entities',
    authMiddleware,
    requireMember,
    entityController.createEntity
);

router.get(
    '/workspaces/:workspaceId/entities',
    authMiddleware,
    requireMember,
    entityController.getEntities
);

router.put(
    '/workspaces/:workspaceId/entities/:id',
    authMiddleware,
    requireMember,
    entityController.updateEntity
);

router.delete(
    '/workspaces/:workspaceId/entities/:id',
    authMiddleware,
    requireAdmin,
    entityController.deleteEntity
);

export default router;
