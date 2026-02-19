import { IWorkItemTypeRepository } from '../../domain/repositories/IWorkItemTypeRepository';
import { WorkItemType } from '../../domain/entities/WorkItemType';
import { CreateWorkItemTypeDTO } from '../dto/WorkItemDTO';
import { ValidationError } from '../../../../shared/domain/errors/AppError';

/**
 * CreateWorkItemType Use Case
 * 
 * Creates a new work item type within a workspace.
 * Validates name uniqueness before creation.
 */
export class CreateWorkItemType {
    constructor(private workItemTypeRepo: IWorkItemTypeRepository) { }

    async execute(dto: CreateWorkItemTypeDTO): Promise<WorkItemType> {
        // 1. Check for duplicate name in workspace
        const existing = await this.workItemTypeRepo.findByName(dto.name, dto.workspaceId);
        if (existing) {
            throw new ValidationError('Work item type with this name already exists in this workspace');
        }

        // 2. Create via factory method (triggers domain validation)
        const typeData = WorkItemType.create(
            dto.workspaceId,
            dto.name,
            dto.description,
            dto.entityType
        );

        // 3. Persist
        return this.workItemTypeRepo.create(typeData);
    }
}
