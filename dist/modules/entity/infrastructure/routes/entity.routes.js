"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const EntityController_1 = require("../../interfaces/http/EntityController");
const EntityPresenter_1 = require("../../interfaces/presenters/EntityPresenter");
// Use cases
const CreateEntity_1 = require("../../application/use-cases/CreateEntity");
const GetEntities_1 = require("../../application/use-cases/GetEntities");
const UpdateEntity_1 = require("../../application/use-cases/UpdateEntity");
const DeleteEntity_1 = require("../../application/use-cases/DeleteEntity");
// Repository implementations
const EntityRepositoryImpl_1 = require("../mongoose/EntityRepositoryImpl");
const WorkspaceRepositoryImpl_1 = require("../../../workspace/infrastructure/mongoose/WorkspaceRepositoryImpl");
// Middleware
const auth_middleware_1 = require("../../../../common/middleware/auth.middleware");
const rbac_middleware_1 = require("../../../../common/middleware/rbac.middleware");
/**
 * Entity Routes (Infrastructure Layer)
 *
 * Manual dependency injection for entity module.
 * 1. Create repository implementations
 * 2. Inject into use cases
 * 3. Inject use cases into controller
 * 4. Wire up Express routes with middleware
 */
const router = (0, express_1.Router)();
// 1. Create repository implementations
const entityRepo = new EntityRepositoryImpl_1.EntityRepositoryImpl();
const workspaceRepo = new WorkspaceRepositoryImpl_1.WorkspaceRepositoryImpl();
// 2. Create use cases with injected dependencies
const createEntityUseCase = new CreateEntity_1.CreateEntity(entityRepo, workspaceRepo);
const getEntitiesUseCase = new GetEntities_1.GetEntities(entityRepo);
const updateEntityUseCase = new UpdateEntity_1.UpdateEntity(entityRepo);
const deleteEntityUseCase = new DeleteEntity_1.DeleteEntity(entityRepo);
// 3. Create presenter
const presenter = new EntityPresenter_1.EntityPresenter();
// 4. Create controller with injected use cases
const entityController = new EntityController_1.EntityController(createEntityUseCase, getEntitiesUseCase, updateEntityUseCase, deleteEntityUseCase, presenter);
// 5. Define routes with authentication and authorization middleware
// All routes are nested under /workspaces/:workspaceId/entities
router.post('/workspaces/:workspaceId/entities', auth_middleware_1.authMiddleware, rbac_middleware_1.requireMember, entityController.createEntity);
router.get('/workspaces/:workspaceId/entities', auth_middleware_1.authMiddleware, rbac_middleware_1.requireMember, entityController.getEntities);
router.put('/workspaces/:workspaceId/entities/:id', auth_middleware_1.authMiddleware, rbac_middleware_1.requireMember, entityController.updateEntity);
router.delete('/workspaces/:workspaceId/entities/:id', auth_middleware_1.authMiddleware, rbac_middleware_1.requireAdmin, entityController.deleteEntity);
exports.default = router;
