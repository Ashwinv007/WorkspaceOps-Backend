import { IWorkItemRepository } from '../../domain/repositories/IWorkItemRepository';
import { IWorkItemDocumentRepository } from '../../domain/repositories/IWorkItemDocumentRepository';
import { NotFoundError } from '../../../../shared/domain/errors/AppError';

/**
 * UnlinkDocument Use Case
 * 
 * Removes a document link from a work item.
 */
export class UnlinkDocument {
    constructor(
        private workItemRepo: IWorkItemRepository,
        private workItemDocumentRepo: IWorkItemDocumentRepository
    ) { }

    async execute(workItemId: string, workspaceId: string, documentId: string): Promise<void> {
        // 1. Validate work item exists
        const item = await this.workItemRepo.findById(workItemId, workspaceId);
        if (!item) {
            throw new NotFoundError('Work item not found');
        }

        // 2. Remove the link
        const removed = await this.workItemDocumentRepo.unlink(workItemId, documentId);
        if (!removed) {
            throw new NotFoundError('Document link not found');
        }
    }
}
