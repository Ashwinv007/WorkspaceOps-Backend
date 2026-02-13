"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const WorkspaceController_1 = require("../../interfaces/http/WorkspaceController");
const WorkspacePresenter_1 = require("../../interfaces/presenters/WorkspacePresenter");
// Use cases
const CreateWorkspace_1 = require("../../application/use-cases/CreateWorkspace");
const GetUserWorkspaces_1 = require("../../application/use-cases/GetUserWorkspaces");
const InviteUserToWorkspace_1 = require("../../application/use-cases/InviteUserToWorkspace");
const UpdateWorkspaceMember_1 = require("../../application/use-cases/UpdateWorkspaceMember");
const RemoveUserFromWorkspace_1 = require("../../application/use-cases/RemoveUserFromWorkspace");
// Repository implementations
const TenantRepositoryImpl_1 = require("../mongoose/TenantRepositoryImpl");
const WorkspaceRepositoryImpl_1 = require("../mongoose/WorkspaceRepositoryImpl");
const WorkspaceMemberRepositoryImpl_1 = require("../mongoose/WorkspaceMemberRepositoryImpl");
const UserRepositoryImpl_1 = require("../../../auth/infrastructure/mongoose/UserRepositoryImpl");
// Middleware
const auth_middleware_1 = require("../../../../common/middleware/auth.middleware");
const rbac_middleware_1 = require("../../../../common/middleware/rbac.middleware");
/**
 * Workspace Routes (Infrastructure Layer)
 *
 * Manual dependency injection for workspace module.
 * 1. Create repository implementations
 * 2. Inject into use cases
 * 3. Inject use cases into controller
 * 4. Wire up Express routes with middleware
 */
const router = (0, express_1.Router)();
// 1. Create repository implementations
const tenantRepo = new TenantRepositoryImpl_1.TenantRepositoryImpl();
const workspaceRepo = new WorkspaceRepositoryImpl_1.WorkspaceRepositoryImpl();
const workspaceMemberRepo = new WorkspaceMemberRepositoryImpl_1.WorkspaceMemberRepositoryImpl();
const userRepo = new UserRepositoryImpl_1.UserRepositoryImpl();
// 2. Create use cases with injected dependencies
const createWorkspaceUseCase = new CreateWorkspace_1.CreateWorkspace(tenantRepo, workspaceRepo, workspaceMemberRepo);
const getUserWorkspacesUseCase = new GetUserWorkspaces_1.GetUserWorkspaces(workspaceRepo, workspaceMemberRepo);
const inviteUserUseCase = new InviteUserToWorkspace_1.InviteUserToWorkspace(workspaceRepo, workspaceMemberRepo, userRepo);
const updateMemberUseCase = new UpdateWorkspaceMember_1.UpdateWorkspaceMember(workspaceMemberRepo);
const removeMemberUseCase = new RemoveUserFromWorkspace_1.RemoveUserFromWorkspace(workspaceMemberRepo);
// 3. Create presenter
const presenter = new WorkspacePresenter_1.WorkspacePresenter();
// 4. Create controller with injected use cases
const workspaceController = new WorkspaceController_1.WorkspaceController(createWorkspaceUseCase, getUserWorkspacesUseCase, inviteUserUseCase, updateMemberUseCase, removeMemberUseCase, presenter);
// 5. Define routes with authentication and authorization middleware
router.post('/', auth_middleware_1.authMiddleware, rbac_middleware_1.requireAdmin, workspaceController.createWorkspace);
router.get('/', auth_middleware_1.authMiddleware, workspaceController.getUserWorkspaces);
router.post('/:id/members', auth_middleware_1.authMiddleware, rbac_middleware_1.requireAdmin, workspaceController.inviteUser);
router.put('/:id/members/:memberId', auth_middleware_1.authMiddleware, rbac_middleware_1.requireAdmin, workspaceController.updateMember);
router.delete('/:id/members/:memberId', auth_middleware_1.authMiddleware, rbac_middleware_1.requireAdmin, workspaceController.removeMember);
exports.default = router;
