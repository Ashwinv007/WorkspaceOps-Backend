"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DocumentTypeController_1 = require("../../interfaces/http/DocumentTypeController");
const DocumentTypePresenter_1 = require("../../interfaces/presenters/DocumentTypePresenter");
// Use cases
const CreateDocumentType_1 = require("../../application/use-cases/CreateDocumentType");
const GetDocumentTypes_1 = require("../../application/use-cases/GetDocumentTypes");
const GetDocumentTypeById_1 = require("../../application/use-cases/GetDocumentTypeById");
const UpdateDocumentType_1 = require("../../application/use-cases/UpdateDocumentType");
const AddField_1 = require("../../application/use-cases/AddField");
const DeleteDocumentType_1 = require("../../application/use-cases/DeleteDocumentType");
// Repository implementations
const DocumentTypeRepositoryImpl_1 = require("../mongoose/DocumentTypeRepositoryImpl");
const WorkspaceRepositoryImpl_1 = require("../../../workspace/infrastructure/mongoose/WorkspaceRepositoryImpl");
// Middleware
const auth_middleware_1 = require("../../../../common/middleware/auth.middleware");
const rbac_middleware_1 = require("../../../../common/middleware/rbac.middleware");
/**
 * Document Type Routes (Infrastructure Layer)
 *
 * Manual dependency injection for document-type module.
 * 1. Create repository implementations
 * 2. Inject into use cases
 * 3. Inject use cases into controller
 * 4. Wire up Express routes with middleware
 */
const router = (0, express_1.Router)();
// 1. Create repository implementations
const documentTypeRepo = new DocumentTypeRepositoryImpl_1.DocumentTypeRepositoryImpl();
const workspaceRepo = new WorkspaceRepositoryImpl_1.WorkspaceRepositoryImpl();
// 2. Create use cases with injected dependencies
const createDocumentTypeUseCase = new CreateDocumentType_1.CreateDocumentType(documentTypeRepo, workspaceRepo);
const getDocumentTypesUseCase = new GetDocumentTypes_1.GetDocumentTypes(documentTypeRepo);
const getDocumentTypeByIdUseCase = new GetDocumentTypeById_1.GetDocumentTypeById(documentTypeRepo);
const updateDocumentTypeUseCase = new UpdateDocumentType_1.UpdateDocumentType(documentTypeRepo);
const addFieldUseCase = new AddField_1.AddField(documentTypeRepo);
const deleteDocumentTypeUseCase = new DeleteDocumentType_1.DeleteDocumentType(documentTypeRepo);
// 3. Create presenter
const presenter = new DocumentTypePresenter_1.DocumentTypePresenter();
// 4. Create controller with injected use cases
const documentTypeController = new DocumentTypeController_1.DocumentTypeController(createDocumentTypeUseCase, getDocumentTypesUseCase, getDocumentTypeByIdUseCase, updateDocumentTypeUseCase, addFieldUseCase, deleteDocumentTypeUseCase, presenter);
// 5. Define routes with authentication and authorization middleware
// All routes are nested under /workspaces/:workspaceId/document-types
// Create document type (Admin/Owner only)
router.post('/workspaces/:workspaceId/document-types', auth_middleware_1.authMiddleware, rbac_middleware_1.requireAdmin, documentTypeController.createDocumentType);
// Get all document types (Member or above)
router.get('/workspaces/:workspaceId/document-types', auth_middleware_1.authMiddleware, rbac_middleware_1.requireMember, documentTypeController.getDocumentTypes);
// Get specific document type (Member or above)
router.get('/workspaces/:workspaceId/document-types/:id', auth_middleware_1.authMiddleware, rbac_middleware_1.requireMember, documentTypeController.getDocumentTypeById);
// Update document type (Admin/Owner only)
router.put('/workspaces/:workspaceId/document-types/:id', auth_middleware_1.authMiddleware, rbac_middleware_1.requireAdmin, documentTypeController.updateDocumentType);
// Add field to document type (Admin/Owner only)
router.post('/workspaces/:workspaceId/document-types/:id/fields', auth_middleware_1.authMiddleware, rbac_middleware_1.requireAdmin, documentTypeController.addField);
// Delete document type (Admin/Owner only)
router.delete('/workspaces/:workspaceId/document-types/:id', auth_middleware_1.authMiddleware, rbac_middleware_1.requireAdmin, documentTypeController.deleteDocumentType);
exports.default = router;
