import { IWorkItemRepository } from '../../domain/repositories/IWorkItemRepository';
import { IWorkItemTypeRepository } from '../../domain/repositories/IWorkItemTypeRepository';
import { WorkItem } from '../../domain/entities/WorkItem';
import { CreateWorkItemDTO } from '../dto/WorkItemDTO';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/AppError';

/**
 * CreateWorkItem Use Case
 * 
 * Creates a new work item in DRAFT status.
 * Validates that the work item type and entity exist in the workspace.
 * If the type has an entityType restriction, validates the entity's role matches.
 */
export class CreateWorkItem {
    constructor(
        private workItemRepo: IWorkItemRepository,
        private workItemTypeRepo: IWorkItemTypeRepository,
        private entityRepo: any // IEntityRepository
    ) { }

    async execute(dto: CreateWorkItemDTO): Promise<WorkItem> {
        // 1. Validate work item type exists in workspace
        const type = await this.workItemTypeRepo.findById(dto.workItemTypeId, dto.workspaceId);
        if (!type) {
            throw new NotFoundError('Work item type not found in this workspace');
        }

        // 2. Validate entity exists in workspace
        const entity = await this.entityRepo.findById(dto.entityId, dto.workspaceId);
        if (!entity) {
            throw new NotFoundError('Entity not found in this workspace');
        }

        // 3. If type has entityType restriction, validate entity role matches
        if (type.entityType && entity.role !== type.entityType) {
            throw new ValidationError(
                `This work item type is restricted to ${type.entityType} entities, but entity has role ${entity.role}`
            );
        }

        // 4. Create domain entity (starts in DRAFT status)
        const itemData = WorkItem.create(
            dto.workspaceId,
            dto.workItemTypeId,
            dto.entityId,
            dto.assignedToUserId,
            dto.title,
            dto.description,
            dto.priority,
            dto.dueDate
        );

        // 5. Persist
        return this.workItemRepo.create(itemData);
    }
}
