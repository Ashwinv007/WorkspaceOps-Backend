import { WorkItem } from '../entities/WorkItem';
import { WorkItemStatus } from '../enums/WorkItemStatus';

/**
 * WorkItem Repository Interface
 * 
 * Defines the contract for work item data access operations.
 * Infrastructure layer will implement this interface.
 */
export interface IWorkItemRepository {
    /**
     * Create a new work item
     */
    create(item: Omit<WorkItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkItem>;

    /**
     * Find work item by ID within a workspace
     */
    findById(id: string, workspaceId: string): Promise<WorkItem | null>;

    /**
     * Find all work items in a workspace with optional filters
     */
    findByWorkspace(
        workspaceId: string,
        filters?: {
            status?: WorkItemStatus;
            workItemTypeId?: string;
            entityId?: string;
            assignedToUserId?: string;
            priority?: string;
        }
    ): Promise<WorkItem[]>;

    /**
     * Find all work items linked to a specific entity
     */
    findByEntity(entityId: string, workspaceId: string): Promise<WorkItem[]>;

    /**
     * Update work item mutable fields (title, description, priority, dueDate, entityId)
     */
    update(
        id: string,
        workspaceId: string,
        updates: {
            title?: string;
            description?: string;
            priority?: string;
            dueDate?: Date;
            entityId?: string;
        }
    ): Promise<WorkItem | null>;

    /**
     * Update work item lifecycle status.
     * Conditional update: only writes if currentStatus matches — prevents concurrent races.
     * Returns null if the status has already changed (caller should treat as 409 Conflict).
     */
    updateStatus(id: string, workspaceId: string, status: WorkItemStatus, currentStatus: WorkItemStatus): Promise<WorkItem | null>;

    /**
     * Delete a work item
     */
    delete(id: string, workspaceId: string): Promise<boolean>;

    /**
     * Count total work items in a workspace (for overview)
     */
    countByWorkspace(workspaceId: string): Promise<number>;

    /**
     * Count work items grouped by status in a workspace (for overview)
     */
    countByStatusGrouped(workspaceId: string): Promise<{ DRAFT: number; ACTIVE: number; COMPLETED: number }>;
}
