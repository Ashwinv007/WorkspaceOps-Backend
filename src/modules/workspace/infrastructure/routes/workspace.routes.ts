import { Router } from 'express';
import { WorkspaceController } from '../../interfaces/http/WorkspaceController';
import { WorkspacePresenter } from '../../interfaces/presenters/WorkspacePresenter';

// Use cases
import { CreateWorkspace } from '../../application/use-cases/CreateWorkspace';
import { GetUserWorkspaces } from '../../application/use-cases/GetUserWorkspaces';
import { InviteUserToWorkspace } from '../../application/use-cases/InviteUserToWorkspace';
import { UpdateWorkspaceMember } from '../../application/use-cases/UpdateWorkspaceMember';
import { RemoveUserFromWorkspace } from '../../application/use-cases/RemoveUserFromWorkspace';

// Repository implementations
import { TenantRepositoryImpl } from '../mongoose/TenantRepositoryImpl';
import { WorkspaceRepositoryImpl } from '../mongoose/WorkspaceRepositoryImpl';
import { WorkspaceMemberRepositoryImpl } from '../mongoose/WorkspaceMemberRepositoryImpl';
import { UserRepositoryImpl } from '../../../auth/infrastructure/mongoose/UserRepositoryImpl';

// Audit log service (cross-cutting)
import { auditLogService } from '../../../audit-log/infrastructure/routes/auditLog.routes';

// Middleware
import { authMiddleware } from '../../../../common/middleware/auth.middleware';
import { requireAdmin, requireMember } from '../../../../common/middleware/rbac.middleware';

/**
 * Workspace Routes (Infrastructure Layer)
 * 
 * Manual dependency injection for workspace module.
 * 1. Create repository implementations
 * 2. Inject into use cases
 * 3. Inject use cases into controller
 * 4. Wire up Express routes with middleware
 */

const router = Router();

// 1. Create repository implementations
const tenantRepo = new TenantRepositoryImpl();
const workspaceRepo = new WorkspaceRepositoryImpl();
const workspaceMemberRepo = new WorkspaceMemberRepositoryImpl();
const userRepo = new UserRepositoryImpl();

// 2. Create use cases with injected dependencies
const createWorkspaceUseCase = new CreateWorkspace(
    tenantRepo,
    workspaceRepo,
    workspaceMemberRepo,
    auditLogService
);

const getUserWorkspacesUseCase = new GetUserWorkspaces(
    workspaceRepo,
    workspaceMemberRepo
);

const inviteUserUseCase = new InviteUserToWorkspace(
    workspaceRepo,
    workspaceMemberRepo,
    userRepo,
    auditLogService
);

const updateMemberUseCase = new UpdateWorkspaceMember(
    workspaceMemberRepo,
    auditLogService
);

const removeMemberUseCase = new RemoveUserFromWorkspace(
    workspaceMemberRepo,
    auditLogService
);

// 3. Create presenter
const presenter = new WorkspacePresenter();

// 4. Create controller with injected use cases
const workspaceController = new WorkspaceController(
    createWorkspaceUseCase,
    getUserWorkspacesUseCase,
    inviteUserUseCase,
    updateMemberUseCase,
    removeMemberUseCase,
    presenter
);

// 5. Define routes with authentication and authorization middleware
// Note: POST / only requires authentication, not RBAC, since no workspace exists yet
router.post('/', authMiddleware, workspaceController.createWorkspace);
router.get('/', authMiddleware, workspaceController.getUserWorkspaces);
router.post('/:id/members', authMiddleware, requireAdmin, workspaceController.inviteUser);
router.put('/:id/members/:memberId', authMiddleware, requireAdmin, workspaceController.updateMember);
router.delete('/:id/members/:memberId', authMiddleware, requireAdmin, workspaceController.removeMember);

export default router;
