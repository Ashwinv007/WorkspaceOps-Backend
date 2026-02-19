import { IWorkItemRepository } from '../../domain/repositories/IWorkItemRepository';
import { WorkItem } from '../../domain/entities/WorkItem';
import { WorkItemStatus } from '../../domain/enums/WorkItemStatus';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/AppError';

/**
 * UpdateWorkItemStatus Use Case
 * 
 * Changes a work item's lifecycle status using the bidirectional state machine.
 * Valid transitions: DRAFT ↔ ACTIVE ↔ COMPLETED
 * Blocked: DRAFT ↔ COMPLETED (must go through ACTIVE)
 */
export class UpdateWorkItemStatus {
    constructor(private workItemRepo: IWorkItemRepository) { }

    async execute(id: string, workspaceId: string, newStatus: WorkItemStatus): Promise<WorkItem> {
        // 1. Validate the status value
        if (!Object.values(WorkItemStatus).includes(newStatus)) {
            throw new ValidationError(
                `Invalid status. Must be one of: ${Object.values(WorkItemStatus).join(', ')}`
            );
        }

        // 2. Fetch current work item
        const item = await this.workItemRepo.findById(id, workspaceId);
        if (!item) {
            throw new NotFoundError('Work item not found');
        }

        // 3. Check if already in the target status
        if (item.status === newStatus) {
            throw new ValidationError(`Work item is already in ${newStatus} status`);
        }

        // 4. Validate transition using domain logic (bidirectional)
        if (!item.canTransitionTo(newStatus)) {
            throw new ValidationError(
                `Cannot transition from ${item.status} to ${newStatus}. ` +
                `Valid transitions: DRAFT ↔ ACTIVE, ACTIVE ↔ COMPLETED`
            );
        }

        // 5. Update status
        const updated = await this.workItemRepo.updateStatus(id, workspaceId, newStatus);
        if (!updated) {
            throw new NotFoundError('Work item not found');
        }

        return updated;
    }
}
