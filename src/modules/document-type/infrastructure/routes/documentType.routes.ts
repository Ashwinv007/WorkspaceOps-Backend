import { Router } from 'express';
import { DocumentTypeController } from '../../interfaces/http/DocumentTypeController';
import { DocumentTypePresenter } from '../../interfaces/presenters/DocumentTypePresenter';

// Use cases
import { CreateDocumentType } from '../../application/use-cases/CreateDocumentType';
import { GetDocumentTypes } from '../../application/use-cases/GetDocumentTypes';
import { GetDocumentTypeById } from '../../application/use-cases/GetDocumentTypeById';
import { UpdateDocumentType } from '../../application/use-cases/UpdateDocumentType';
import { AddField } from '../../application/use-cases/AddField';
import { DeleteDocumentType } from '../../application/use-cases/DeleteDocumentType';

// Repository implementations
import { DocumentTypeRepositoryImpl } from '../mongoose/DocumentTypeRepositoryImpl';
import { WorkspaceRepositoryImpl } from '../../../workspace/infrastructure/mongoose/WorkspaceRepositoryImpl';

// Middleware
import { authMiddleware } from '../../../../common/middleware/auth.middleware';
import { requireAdmin, requireMember } from '../../../../common/middleware/rbac.middleware';

/**
 * Document Type Routes (Infrastructure Layer)
 * 
 * Manual dependency injection for document-type module.
 * 1. Create repository implementations
 * 2. Inject into use cases
 * 3. Inject use cases into controller
 * 4. Wire up Express routes with middleware
 */

const router = Router();

// 1. Create repository implementations
const documentTypeRepo = new DocumentTypeRepositoryImpl();
const workspaceRepo = new WorkspaceRepositoryImpl();

// 2. Create use cases with injected dependencies
const createDocumentTypeUseCase = new CreateDocumentType(
    documentTypeRepo,
    workspaceRepo
);

const getDocumentTypesUseCase = new GetDocumentTypes(
    documentTypeRepo
);

const getDocumentTypeByIdUseCase = new GetDocumentTypeById(
    documentTypeRepo
);

const updateDocumentTypeUseCase = new UpdateDocumentType(
    documentTypeRepo
);

const addFieldUseCase = new AddField(
    documentTypeRepo
);

const deleteDocumentTypeUseCase = new DeleteDocumentType(
    documentTypeRepo
);

// 3. Create presenter
const presenter = new DocumentTypePresenter();

// 4. Create controller with injected use cases
const documentTypeController = new DocumentTypeController(
    createDocumentTypeUseCase,
    getDocumentTypesUseCase,
    getDocumentTypeByIdUseCase,
    updateDocumentTypeUseCase,
    addFieldUseCase,
    deleteDocumentTypeUseCase,
    presenter
);

// 5. Define routes with authentication and authorization middleware
// All routes are nested under /workspaces/:workspaceId/document-types

// Create document type (Admin/Owner only)
router.post(
    '/workspaces/:workspaceId/document-types',
    authMiddleware,
    requireAdmin,
    documentTypeController.createDocumentType
);

// Get all document types (Member or above)
router.get(
    '/workspaces/:workspaceId/document-types',
    authMiddleware,
    requireMember,
    documentTypeController.getDocumentTypes
);

// Get specific document type (Member or above)
router.get(
    '/workspaces/:workspaceId/document-types/:id',
    authMiddleware,
    requireMember,
    documentTypeController.getDocumentTypeById
);

// Update document type (Admin/Owner only)
router.put(
    '/workspaces/:workspaceId/document-types/:id',
    authMiddleware,
    requireAdmin,
    documentTypeController.updateDocumentType
);

// Add field to document type (Admin/Owner only)
router.post(
    '/workspaces/:workspaceId/document-types/:id/fields',
    authMiddleware,
    requireAdmin,
    documentTypeController.addField
);

// Delete document type (Admin/Owner only)
router.delete(
    '/workspaces/:workspaceId/document-types/:id',
    authMiddleware,
    requireAdmin,
    documentTypeController.deleteDocumentType
);

export default router;
