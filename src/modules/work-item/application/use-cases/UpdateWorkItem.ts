import { IWorkItemRepository } from '../../domain/repositories/IWorkItemRepository';
import { WorkItem } from '../../domain/entities/WorkItem';
import { UpdateWorkItemDTO } from '../dto/WorkItemDTO';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/AppError';

/**
 * UpdateWorkItem Use Case
 * 
 * Updates mutable fields on a work item: title, description, priority, dueDate, entityId.
 * Validates that at least one field is being updated.
 */
export class UpdateWorkItem {
    constructor(
        private workItemRepo: IWorkItemRepository,
        private entityRepo: any // IEntityRepository
    ) { }

    async execute(id: string, workspaceId: string, dto: UpdateWorkItemDTO): Promise<WorkItem> {
        // 1. Validate at least one field is being updated
        const hasUpdates = dto.title || dto.description !== undefined || dto.priority || dto.dueDate || dto.entityId;
        if (!hasUpdates) {
            throw new ValidationError('At least one field must be provided for update');
        }

        // 2. Check work item exists
        const item = await this.workItemRepo.findById(id, workspaceId);
        if (!item) {
            throw new NotFoundError('Work item not found');
        }

        // 3. If entityId is being changed, validate the new entity exists
        if (dto.entityId && dto.entityId !== item.entityId) {
            const entity = await this.entityRepo.findById(dto.entityId, workspaceId);
            if (!entity) {
                throw new NotFoundError('Entity not found in this workspace');
            }
        }

        // 4. Validate title length if provided
        if (dto.title) {
            if (dto.title.trim().length === 0) {
                throw new ValidationError('Title cannot be empty');
            }
            if (dto.title.trim().length > 255) {
                throw new ValidationError('Title must not exceed 255 characters');
            }
        }

        // 5. Validate description length if provided
        if (dto.description && dto.description.length > 2000) {
            throw new ValidationError('Description must not exceed 2000 characters');
        }

        // 6. Build updates (trim strings)
        const updates: any = {};
        if (dto.title) updates.title = dto.title.trim();
        if (dto.description !== undefined) updates.description = dto.description?.trim();
        if (dto.priority) updates.priority = dto.priority;
        if (dto.dueDate !== undefined) updates.dueDate = dto.dueDate;
        if (dto.entityId) updates.entityId = dto.entityId;

        // 7. Persist
        const updated = await this.workItemRepo.update(id, workspaceId, updates);
        if (!updated) {
            throw new NotFoundError('Work item not found');
        }

        return updated;
    }
}
