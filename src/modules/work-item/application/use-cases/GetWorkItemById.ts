import { IWorkItemRepository } from '../../domain/repositories/IWorkItemRepository';
import { WorkItem } from '../../domain/entities/WorkItem';
import { NotFoundError } from '../../../../shared/domain/errors/AppError';

/**
 * GetWorkItemById Use Case
 * 
 * Retrieves a single work item by its ID within a workspace.
 */
export class GetWorkItemById {
    constructor(private workItemRepo: IWorkItemRepository) { }

    async execute(id: string, workspaceId: string): Promise<WorkItem> {
        const item = await this.workItemRepo.findById(id, workspaceId);
        if (!item) {
            throw new NotFoundError('Work item not found');
        }
        return item;
    }
}
