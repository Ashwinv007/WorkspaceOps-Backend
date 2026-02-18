import { Router } from 'express';
import { DocumentController } from '../../interfaces/http/DocumentController';
import { DocumentPresenter } from '../../interfaces/presenters/DocumentPresenter';

// Use cases
import { UploadDocument } from '../../application/use-cases/UploadDocument';
import { GetDocuments } from '../../application/use-cases/GetDocuments';
import { GetDocumentById } from '../../application/use-cases/GetDocumentById';
import { GetDocumentsByEntity } from '../../application/use-cases/GetDocumentsByEntity';
import { GetExpiringDocuments } from '../../application/use-cases/GetExpiringDocuments';
import { UpdateDocument } from '../../application/use-cases/UpdateDocument';
import { DeleteDocument } from '../../application/use-cases/DeleteDocument';

// Repository implementations
import { DocumentRepositoryImpl } from '../mongoose/DocumentRepositoryImpl';
import { DocumentTypeRepositoryImpl } from '../../../document-type/infrastructure/mongoose/DocumentTypeRepositoryImpl';
import { EntityRepositoryImpl } from '../../../entity/infrastructure/mongoose/EntityRepositoryImpl';

// Infrastructure services
import { LocalFileStorageService } from '../storage/FileStorageService';
import { upload } from '../middleware/upload.middleware';

// Middleware
import { authMiddleware } from '../../../../common/middleware/auth.middleware';
import { requireAdmin, requireMember } from '../../../../common/middleware/rbac.middleware';

/**
 * Document Routes (Infrastructure Layer)
 * 
 * Manual dependency injection for document module.
 * 1. Create repository implementations and services
 * 2. Inject into use cases
 * 3. Inject use cases into controller
 * 4. Wire up Express routes with middleware
 */

const router = Router();

// 1. Create repository implementations and services
const documentRepo = new DocumentRepositoryImpl();
const documentTypeRepo = new DocumentTypeRepositoryImpl();
const entityRepo = new EntityRepositoryImpl();
const fileStorageService = new LocalFileStorageService(
    process.env.UPLOAD_DIR || './uploads'
);

// 2. Create use cases with injected dependencies
const uploadDocumentUseCase = new UploadDocument(
    documentRepo,
    documentTypeRepo,
    entityRepo
);

const getDocumentsUseCase = new GetDocuments(documentRepo);

const getDocumentByIdUseCase = new GetDocumentById(documentRepo);

const getDocumentsByEntityUseCase = new GetDocumentsByEntity(documentRepo);

const getExpiringDocumentsUseCase = new GetExpiringDocuments(documentRepo);

const updateDocumentUseCase = new UpdateDocument(documentRepo);

const deleteDocumentUseCase = new DeleteDocument(documentRepo);

// 3. Create presenter
const presenter = new DocumentPresenter();

// 4. Create controller with injected use cases
const documentController = new DocumentController(
    uploadDocumentUseCase,
    getDocumentsUseCase,
    getDocumentByIdUseCase,
    getDocumentsByEntityUseCase,
    getExpiringDocumentsUseCase,
    updateDocumentUseCase,
    deleteDocumentUseCase,
    fileStorageService,
    presenter
);

// 5. Define routes with authentication and authorization middleware
// All routes are nested under /workspaces/:workspaceId/documents

// Upload document (Member or above) - with file upload middleware
router.post(
    '/workspaces/:workspaceId/documents',
    authMiddleware,
    requireMember,
    upload.single('file'),
    documentController.uploadDocument
);

// Get all documents (Member or above)
router.get(
    '/workspaces/:workspaceId/documents',
    authMiddleware,
    requireMember,
    documentController.getDocuments
);

// Get expiring documents (Member or above)
// NOTE: This must come BEFORE /:id route to avoid conflict
router.get(
    '/workspaces/:workspaceId/documents/expiring',
    authMiddleware,
    requireMember,
    documentController.getExpiringDocuments
);

// Get specific document (Member or above)
router.get(
    '/workspaces/:workspaceId/documents/:id',
    authMiddleware,
    requireMember,
    documentController.getDocumentById
);

// Download document (Member or above)
router.get(
    '/workspaces/:workspaceId/documents/:id/download',
    authMiddleware,
    requireMember,
    documentController.downloadDocument
);

// Get documents by entity (Member or above)
router.get(
    '/workspaces/:workspaceId/entities/:entityId/documents',
    authMiddleware,
    requireMember,
    documentController.getDocumentsByEntity
);

// Update document (Member or above)
router.put(
    '/workspaces/:workspaceId/documents/:id',
    authMiddleware,
    requireMember,
    documentController.updateDocument
);

// Delete document (Admin/Owner only)
router.delete(
    '/workspaces/:workspaceId/documents/:id',
    authMiddleware,
    requireAdmin,
    documentController.deleteDocument
);

export default router;
