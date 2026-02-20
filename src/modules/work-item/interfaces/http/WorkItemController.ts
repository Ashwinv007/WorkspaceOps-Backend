import { Request, Response, NextFunction } from 'express';
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
import { IWorkItemDocumentRepository } from '../../domain/repositories/IWorkItemDocumentRepository';
import { WorkItemPresenter } from '../presenters/WorkItemPresenter';
import { WorkItemStatus } from '../../domain/enums/WorkItemStatus';
import { WorkItemPriority } from '../../domain/enums/WorkItemPriority';
import { CreateWorkItemTypeDTO, CreateWorkItemDTO, UpdateWorkItemDTO, WorkItemFilters } from '../../application/dto/WorkItemDTO';

/**
 * WorkItemController
 * 
 * Handles all HTTP requests for work item types and work items.
 * 13 endpoints total (3 type + 10 item).
 */
export class WorkItemController {
    constructor(
        private readonly createWorkItemTypeUC: CreateWorkItemType,
        private readonly getWorkItemTypesUC: GetWorkItemTypes,
        private readonly deleteWorkItemTypeUC: DeleteWorkItemType,
        private readonly createWorkItemUC: CreateWorkItem,
        private readonly getWorkItemsUC: GetWorkItems,
        private readonly getWorkItemByIdUC: GetWorkItemById,
        private readonly getWorkItemsByEntityUC: GetWorkItemsByEntity,
        private readonly updateWorkItemUC: UpdateWorkItem,
        private readonly updateWorkItemStatusUC: UpdateWorkItemStatus,
        private readonly linkDocumentUC: LinkDocument,
        private readonly unlinkDocumentUC: UnlinkDocument,
        private readonly deleteWorkItemUC: DeleteWorkItem,
        private readonly workItemDocumentRepo: IWorkItemDocumentRepository,
        private readonly getLinkedDocumentsUC: GetLinkedDocuments,
        private readonly presenter: WorkItemPresenter
    ) {
        // Bind all methods to this instance
        this.createWorkItemType = this.createWorkItemType.bind(this);
        this.getWorkItemTypes = this.getWorkItemTypes.bind(this);
        this.deleteWorkItemType = this.deleteWorkItemType.bind(this);
        this.createWorkItem = this.createWorkItem.bind(this);
        this.getWorkItems = this.getWorkItems.bind(this);
        this.getWorkItemById = this.getWorkItemById.bind(this);
        this.getWorkItemsByEntity = this.getWorkItemsByEntity.bind(this);
        this.updateWorkItem = this.updateWorkItem.bind(this);
        this.updateWorkItemStatus = this.updateWorkItemStatus.bind(this);
        this.linkDocument = this.linkDocument.bind(this);
        this.unlinkDocument = this.unlinkDocument.bind(this);
        this.deleteWorkItem = this.deleteWorkItem.bind(this);
        this.getLinkedDocuments = this.getLinkedDocuments.bind(this);
    }

    // ==========================================
    // WORK ITEM TYPE ENDPOINTS
    // ==========================================

    /**
     * POST /workspaces/:workspaceId/work-item-types
     * Create a new work item type
     */
    async createWorkItemType(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { workspaceId } = req.params;
            const { name, description, entityType } = req.body;

            const dto: CreateWorkItemTypeDTO = {
                workspaceId: workspaceId as string,
                userId: (req as any).user.userId,
                name,
                description,
                entityType
            };

            const type = await this.createWorkItemTypeUC.execute(dto);
            res.status(201).json(this.presenter.presentWorkItemType(type));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /workspaces/:workspaceId/work-item-types
     * List all work item types in a workspace
     */
    async getWorkItemTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { workspaceId } = req.params;
            const types = await this.getWorkItemTypesUC.execute(workspaceId as string);
            res.json(this.presenter.presentWorkItemTypes(types));
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /workspaces/:workspaceId/work-item-types/:id
     * Delete a work item type (fails if work items reference it)
     */
    async deleteWorkItemType(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { workspaceId, id } = req.params;
            await this.deleteWorkItemTypeUC.execute(id as string, workspaceId as string, (req as any).user.userId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    // ==========================================
    // WORK ITEM ENDPOINTS
    // ==========================================

    /**
     * POST /workspaces/:workspaceId/work-items
     * Create a new work item (starts in DRAFT status)
     */
    async createWorkItem(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { workspaceId } = req.params;
            const userId = (req as any).user.userId;
            const { workItemTypeId, entityId, title, description, priority, dueDate } = req.body;

            const dto: CreateWorkItemDTO = {
                workspaceId: workspaceId as string,
                workItemTypeId,
                entityId,
                assignedToUserId: userId,
                title,
                description,
                priority,
                dueDate: dueDate ? new Date(dueDate) : undefined
            };

            const item = await this.createWorkItemUC.execute(dto);
            res.status(201).json(this.presenter.presentWorkItem(item));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /workspaces/:workspaceId/work-items
     * List work items with optional filters
     * Query params: status, workItemTypeId, entityId, assignedToUserId, priority
     */
    async getWorkItems(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { workspaceId } = req.params;
            const { status, workItemTypeId, entityId, assignedToUserId, priority } = req.query;

            const filters: WorkItemFilters = {};
            if (status) filters.status = status as WorkItemStatus;
            if (workItemTypeId) filters.workItemTypeId = workItemTypeId as string;
            if (entityId) filters.entityId = entityId as string;
            if (assignedToUserId) filters.assignedToUserId = assignedToUserId as string;
            if (priority) filters.priority = priority as WorkItemPriority;

            const items = await this.getWorkItemsUC.execute(workspaceId as string, filters);
            res.json(this.presenter.presentWorkItems(items));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /workspaces/:workspaceId/work-items/:id
     * Get a single work item by ID (includes linked document IDs)
     */
    async getWorkItemById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { workspaceId, id } = req.params;
            const item = await this.getWorkItemByIdUC.execute(id as string, workspaceId as string);

            // Fetch linked document IDs
            const links = await this.workItemDocumentRepo.findByWorkItem(id as string);
            const linkedDocumentIds = links.map(l => l.documentId);

            res.json(this.presenter.presentWorkItem(item, linkedDocumentIds));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /workspaces/:workspaceId/entities/:entityId/work-items
     * Get all work items for a specific entity
     */
    async getWorkItemsByEntity(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { workspaceId, entityId } = req.params;
            const items = await this.getWorkItemsByEntityUC.execute(entityId as string, workspaceId as string);
            res.json(this.presenter.presentWorkItems(items));
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /workspaces/:workspaceId/work-items/:id
     * Update mutable fields on a work item
     */
    async updateWorkItem(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { workspaceId, id } = req.params;
            const { title, description, priority, dueDate, entityId } = req.body;

            const dto: UpdateWorkItemDTO = {
                title,
                description,
                priority,
                dueDate: dueDate ? new Date(dueDate) : dueDate,
                entityId
            };

            const updated = await this.updateWorkItemUC.execute(id as string, workspaceId as string, dto, (req as any).user.userId);
            res.json(this.presenter.presentWorkItem(updated));
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /workspaces/:workspaceId/work-items/:id/status
     * Change work item lifecycle status (bidirectional transitions)
     */
    async updateWorkItemStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { workspaceId, id } = req.params;
            const { status } = req.body;

            const updated = await this.updateWorkItemStatusUC.execute(id as string, workspaceId as string, status as WorkItemStatus, (req as any).user.userId);
            res.json(this.presenter.presentWorkItem(updated));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /workspaces/:workspaceId/work-items/:id/documents
     * Link a document to a work item
     */
    async linkDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { workspaceId, id } = req.params;
            const { documentId } = req.body;

            const link = await this.linkDocumentUC.execute(id as string, workspaceId as string, documentId, (req as any).user.userId);
            res.json(this.presenter.presentWorkItemDocument(link));
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /workspaces/:workspaceId/work-items/:id/documents/:docId
     * Unlink a document from a work item
     */
    async unlinkDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { workspaceId, id, docId } = req.params;
            await this.unlinkDocumentUC.execute(id as string, workspaceId as string, docId as string, (req as any).user.userId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /workspaces/:workspaceId/work-items/:id/documents
     * Get all documents linked to a work item
     */
    async getLinkedDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { workspaceId, id } = req.params;

            // Verify work item exists
            await this.getWorkItemByIdUC.execute(id as string, workspaceId as string);

            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const docs = await this.getLinkedDocumentsUC.execute(id as string, workspaceId as string);
            res.json(this.presenter.presentLinkedDocuments(docs, baseUrl));
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /workspaces/:workspaceId/work-items/:id
     * Delete a work item (Admin only, cascades document links)
     */
    async deleteWorkItem(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { workspaceId, id } = req.params;
            await this.deleteWorkItemUC.execute(id as string, workspaceId as string, (req as any).user.userId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}
