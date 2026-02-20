import { Router } from 'express';
import { WorkItemController } from '../../interfaces/http/WorkItemController';
import { WorkItemPresenter } from '../../interfaces/presenters/WorkItemPresenter';

// Use cases
import { CreateWorkItemType } from '../../application/use-cases/CreateWorkItemType';
import { GetWorkItemTypes } from '../../application/use-cases/GetWorkItemTypes';
import { DeleteWorkItemType } from '../../application/use-cases/DeleteWorkItemType';
import { CreateWorkItem } from '../../application/use-cases/CreateWorkItem';
import { GetWorkItems } from '../../application/use-cases/GetWorkItems';
import { GetWorkItemById } from '../../application/use-cases/GetWorkItemById';
import { GetWorkItemsByEntity } from '../../application/use-cases/GetWorkItemsByEntity';
import { UpdateWorkItem } from '../../application/use-cases/UpdateWorkItem';
import { UpdateWorkItemStatus } from '../../application/use-cases/UpdateWorkItemStatus';
import { LinkDocument } from '../../application/use-cases/LinkDocument';
import { UnlinkDocument } from '../../application/use-cases/UnlinkDocument';
import { DeleteWorkItem } from '../../application/use-cases/DeleteWorkItem';
import { GetLinkedDocuments } from '../../application/use-cases/GetLinkedDocuments';

// Repository implementations
import { WorkItemTypeRepositoryImpl } from '../mongoose/WorkItemTypeRepositoryImpl';
import { WorkItemRepositoryImpl } from '../mongoose/WorkItemRepositoryImpl';
import { WorkItemDocumentRepositoryImpl } from '../mongoose/WorkItemDocumentRepositoryImpl';
import { EntityRepositoryImpl } from '../../../entity/infrastructure/mongoose/EntityRepositoryImpl';
import { DocumentRepositoryImpl } from '../../../document/infrastructure/mongoose/DocumentRepositoryImpl';

// Audit log service (cross-cutting)
import { auditLogService } from '../../../audit-log/infrastructure/routes/auditLog.routes';

// Middleware
import { authMiddleware } from '../../../../common/middleware/auth.middleware';
import { requireAdmin, requireMember } from '../../../../common/middleware/rbac.middleware';

/**
 * Work Item Routes (Infrastructure Layer)
 * 
 * Manual dependency injection for work item module.
 * 1. Create repository implementations
 * 2. Inject into use cases
 * 3. Inject use cases into controller
 * 4. Wire up Express routes with middleware
 */

const router = Router();

// 1. Create repository implementations
const workItemTypeRepo = new WorkItemTypeRepositoryImpl();
const workItemRepo = new WorkItemRepositoryImpl();
const workItemDocumentRepo = new WorkItemDocumentRepositoryImpl();
const entityRepo = new EntityRepositoryImpl();
const documentRepo = new DocumentRepositoryImpl();

// 2. Create use cases with injected dependencies

// Work Item Type use cases
const createWorkItemTypeUC = new CreateWorkItemType(workItemTypeRepo, auditLogService);
const getWorkItemTypesUC = new GetWorkItemTypes(workItemTypeRepo);
const deleteWorkItemTypeUC = new DeleteWorkItemType(workItemTypeRepo, workItemRepo, auditLogService);

// Work Item use cases
const createWorkItemUC = new CreateWorkItem(workItemRepo, workItemTypeRepo, entityRepo, auditLogService);
const getWorkItemsUC = new GetWorkItems(workItemRepo);
const getWorkItemByIdUC = new GetWorkItemById(workItemRepo);
const getWorkItemsByEntityUC = new GetWorkItemsByEntity(workItemRepo);
const updateWorkItemUC = new UpdateWorkItem(workItemRepo, entityRepo, auditLogService);
const updateWorkItemStatusUC = new UpdateWorkItemStatus(workItemRepo, auditLogService);
const linkDocumentUC = new LinkDocument(workItemRepo, workItemDocumentRepo, documentRepo, auditLogService);
const unlinkDocumentUC = new UnlinkDocument(workItemRepo, workItemDocumentRepo, auditLogService);
const deleteWorkItemUC = new DeleteWorkItem(workItemRepo, workItemDocumentRepo, auditLogService);
const getLinkedDocumentsUC = new GetLinkedDocuments(workItemDocumentRepo, documentRepo);

// 3. Create presenter and controller
const presenter = new WorkItemPresenter();
const controller = new WorkItemController(
    createWorkItemTypeUC,
    getWorkItemTypesUC,
    deleteWorkItemTypeUC,
    createWorkItemUC,
    getWorkItemsUC,
    getWorkItemByIdUC,
    getWorkItemsByEntityUC,
    updateWorkItemUC,
    updateWorkItemStatusUC,
    linkDocumentUC,
    unlinkDocumentUC,
    deleteWorkItemUC,
    workItemDocumentRepo,
    getLinkedDocumentsUC,
    presenter
);

// 4. Define routes with authentication and authorization middleware

// ==========================================
// WORK ITEM TYPE ROUTES
// ==========================================

// Create work item type (Admin/Owner only)
router.post(
    '/workspaces/:workspaceId/work-item-types',
    authMiddleware,
    requireAdmin,
    controller.createWorkItemType
);

// List all work item types (Member or above)
router.get(
    '/workspaces/:workspaceId/work-item-types',
    authMiddleware,
    requireMember,
    controller.getWorkItemTypes
);

// Delete work item type (Admin/Owner only)
router.delete(
    '/workspaces/:workspaceId/work-item-types/:id',
    authMiddleware,
    requireAdmin,
    controller.deleteWorkItemType
);

// ==========================================
// WORK ITEM ROUTES
// ==========================================

// Create work item (Member or above)
router.post(
    '/workspaces/:workspaceId/work-items',
    authMiddleware,
    requireMember,
    controller.createWorkItem
);

// List work items with filters (Member or above)
router.get(
    '/workspaces/:workspaceId/work-items',
    authMiddleware,
    requireMember,
    controller.getWorkItems
);

// Get specific work item (Member or above)
router.get(
    '/workspaces/:workspaceId/work-items/:id',
    authMiddleware,
    requireMember,
    controller.getWorkItemById
);

// Update work item fields (Member or above)
router.put(
    '/workspaces/:workspaceId/work-items/:id',
    authMiddleware,
    requireMember,
    controller.updateWorkItem
);

// Update work item status - lifecycle transition (Member or above)
router.patch(
    '/workspaces/:workspaceId/work-items/:id/status',
    authMiddleware,
    requireMember,
    controller.updateWorkItemStatus
);

// Link document to work item (Member or above)
router.post(
    '/workspaces/:workspaceId/work-items/:id/documents',
    authMiddleware,
    requireMember,
    controller.linkDocument
);

// Get linked documents for a work item (Member or above)
router.get(
    '/workspaces/:workspaceId/work-items/:id/documents',
    authMiddleware,
    requireMember,
    controller.getLinkedDocuments
);

// Unlink document from work item (Member or above)
router.delete(
    '/workspaces/:workspaceId/work-items/:id/documents/:docId',
    authMiddleware,
    requireMember,
    controller.unlinkDocument
);

// Delete work item (Admin/Owner only)
router.delete(
    '/workspaces/:workspaceId/work-items/:id',
    authMiddleware,
    requireAdmin,
    controller.deleteWorkItem
);

// ==========================================
// CROSS-ENTITY ROUTE
// ==========================================

// Get work items by entity (Member or above)
router.get(
    '/workspaces/:workspaceId/entities/:entityId/work-items',
    authMiddleware,
    requireMember,
    controller.getWorkItemsByEntity
);

export default router;
