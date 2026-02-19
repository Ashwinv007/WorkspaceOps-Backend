import { WorkItemStatus } from '../../domain/enums/WorkItemStatus';
import { WorkItemPriority } from '../../domain/enums/WorkItemPriority';

/**
 * Data Transfer Objects for Work Item Module
 */

// --- Work Item Type DTOs ---

export interface CreateWorkItemTypeDTO {
    workspaceId: string;
    name: string;
    description?: string;
    entityType?: string;
}

// --- Work Item DTOs ---

export interface CreateWorkItemDTO {
    workspaceId: string;
    workItemTypeId: string;
    entityId: string;
    assignedToUserId: string;
    title: string;
    description?: string;
    priority?: WorkItemPriority;
    dueDate?: Date;
}

export interface UpdateWorkItemDTO {
    title?: string;
    description?: string;
    priority?: WorkItemPriority;
    dueDate?: Date;
    entityId?: string;
}

export interface WorkItemFilters {
    status?: WorkItemStatus;
    workItemTypeId?: string;
    entityId?: string;
    assignedToUserId?: string;
    priority?: WorkItemPriority;
}
