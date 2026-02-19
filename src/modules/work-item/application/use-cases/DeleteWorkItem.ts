import { IWorkItemRepository } from '../../domain/repositories/IWorkItemRepository';
import { IWorkItemDocumentRepository } from '../../domain/repositories/IWorkItemDocumentRepository';
import { NotFoundError } from '../../../../shared/domain/errors/AppError';

/**
 * DeleteWorkItem Use Case
 * 
 * Deletes a work item and cleans up associated document links.
 */
export class DeleteWorkItem {
    constructor(
        private workItemRepo: IWorkItemRepository,
        private workItemDocumentRepo: IWorkItemDocumentRepository
    ) { }

    async execute(id: string, workspaceId: string): Promise<void> {
        // 1. Check work item exists
        const item = await this.workItemRepo.findById(id, workspaceId);
        if (!item) {
            throw new NotFoundError('Work item not found');
        }

        // 2. Clean up document links first
        await this.workItemDocumentRepo.deleteByWorkItem(id);

        // 3. Delete the work item
        await this.workItemRepo.delete(id, workspaceId);
    }
}
