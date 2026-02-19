import { ValidationError } from '../../../../shared/domain/errors/AppError';
import { WorkItemStatus } from '../enums/WorkItemStatus';
import { WorkItemPriority } from '../enums/WorkItemPriority';

/**
 * WorkItem Domain Entity
 * 
 * Represents a work item within a workspace, linked to an entity and
 * assigned to a user. Has lifecycle states with bidirectional transitions.
 * 
 * ER Diagram mapping:
 * {
 *   id: UUID PK,
 *   workspace_id: UUID FK → workspaces,
 *   work_item_type_id: UUID FK → work_item_types,
 *   entity_id: UUID FK → entities,
 *   assigned_to_user_id: UUID FK → users,
 *   title: VARCHAR(255),
 *   description: TEXT,
 *   status: VARCHAR(20) CHECK (IN ('DRAFT','ACTIVE','COMPLETED')),
 *   priority: VARCHAR(20) CHECK (IN ('LOW','MEDIUM','HIGH')),
 *   due_date: TIMESTAMP,
 *   created_at: TIMESTAMP,
 *   updated_at: TIMESTAMP
 * }
 */
export class WorkItem {
    constructor(
        public readonly id: string,
        public readonly workspaceId: string,
        public readonly workItemTypeId: string,
        public readonly entityId: string,
        public readonly assignedToUserId: string,
        public readonly title: string,
        public readonly status: WorkItemStatus,
        public readonly createdAt: Date,
        public readonly updatedAt: Date,
        public readonly description?: string,
        public readonly priority?: WorkItemPriority,
        public readonly dueDate?: Date
    ) {
        this.validate();
    }

    private validate(): void {
        if (!this.workspaceId || !this.workspaceId.trim()) {
            throw new ValidationError('Workspace ID is required');
        }

        if (!this.workItemTypeId || !this.workItemTypeId.trim()) {
            throw new ValidationError('Work item type ID is required');
        }

        if (!this.entityId || !this.entityId.trim()) {
            throw new ValidationError('Entity ID is required');
        }

        if (!this.assignedToUserId || !this.assignedToUserId.trim()) {
            throw new ValidationError('Assigned user ID is required');
        }

        if (!this.title || !this.title.trim()) {
            throw new ValidationError('Title is required');
        }

        if (this.title.trim().length > 255) {
            throw new ValidationError('Title must not exceed 255 characters');
        }

        if (this.description && this.description.length > 2000) {
            throw new ValidationError('Description must not exceed 2000 characters');
        }

        if (!Object.values(WorkItemStatus).includes(this.status)) {
            throw new ValidationError(
                `Invalid status. Must be one of: ${Object.values(WorkItemStatus).join(', ')}`
            );
        }

        if (this.priority && !Object.values(WorkItemPriority).includes(this.priority)) {
            throw new ValidationError(
                `Invalid priority. Must be one of: ${Object.values(WorkItemPriority).join(', ')}`
            );
        }
    }

    /**
     * Bidirectional state machine
     * 
     * DRAFT ↔ ACTIVE ↔ COMPLETED
     * DRAFT ↔ COMPLETED is blocked (must go through ACTIVE)
     * 
     * @param newStatus The target status to transition to
     * @returns true if the transition is valid
     */
    canTransitionTo(newStatus: WorkItemStatus): boolean {
        const transitions: Record<WorkItemStatus, WorkItemStatus[]> = {
            [WorkItemStatus.DRAFT]: [WorkItemStatus.ACTIVE],
            [WorkItemStatus.ACTIVE]: [WorkItemStatus.DRAFT, WorkItemStatus.COMPLETED],
            [WorkItemStatus.COMPLETED]: [WorkItemStatus.ACTIVE]
        };
        return transitions[this.status].includes(newStatus);
    }

    /**
     * Factory method for creating new work items (without id, createdAt, updatedAt)
     * New work items always start in DRAFT status.
     */
    static create(
        workspaceId: string,
        workItemTypeId: string,
        entityId: string,
        assignedToUserId: string,
        title: string,
        description?: string,
        priority?: WorkItemPriority,
        dueDate?: Date
    ): Omit<WorkItem, 'id' | 'createdAt' | 'updatedAt'> {
        const now = new Date();
        const temp = new WorkItem(
            'temp',
            workspaceId,
            workItemTypeId,
            entityId,
            assignedToUserId,
            title.trim(),
            WorkItemStatus.DRAFT,
            now,
            now,
            description?.trim(),
            priority,
            dueDate
        );

        return {
            workspaceId: temp.workspaceId,
            workItemTypeId: temp.workItemTypeId,
            entityId: temp.entityId,
            assignedToUserId: temp.assignedToUserId,
            title: temp.title,
            status: temp.status,
            description: temp.description,
            priority: temp.priority,
            dueDate: temp.dueDate,
            canTransitionTo: temp.canTransitionTo.bind(temp),
            validate: temp.validate.bind(temp)
        } as any;
    }
}
