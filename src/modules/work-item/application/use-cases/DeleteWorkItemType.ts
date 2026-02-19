import { IWorkItemTypeRepository } from '../../domain/repositories/IWorkItemTypeRepository';
import { IWorkItemRepository } from '../../domain/repositories/IWorkItemRepository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/AppError';

/**
 * DeleteWorkItemType Use Case
 * 
 * Deletes a work item type from a workspace.
 * Prevents deletion if any work items reference this type.
 */
export class DeleteWorkItemType {
    constructor(
        private workItemTypeRepo: IWorkItemTypeRepository,
        private workItemRepo: IWorkItemRepository
    ) { }

    async execute(id: string, workspaceId: string): Promise<void> {
        // 1. Check type exists
        const type = await this.workItemTypeRepo.findById(id, workspaceId);
        if (!type) {
            throw new NotFoundError('Work item type not found');
        }

        // 2. Check no work items reference this type
        const items = await this.workItemRepo.findByWorkspace(workspaceId, { workItemTypeId: id });
        if (items.length > 0) {
            throw new ValidationError(
                `Cannot delete: ${items.length} work item(s) reference this type`
            );
        }

        // 3. Delete
        await this.workItemTypeRepo.delete(id, workspaceId);
    }
}
