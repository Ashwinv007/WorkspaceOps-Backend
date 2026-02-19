import { IWorkItemRepository } from '../../domain/repositories/IWorkItemRepository';
import { WorkItem } from '../../domain/entities/WorkItem';

/**
 * GetWorkItemsByEntity Use Case
 * 
 * Retrieves all work items linked to a specific entity within a workspace.
 */
export class GetWorkItemsByEntity {
    constructor(private workItemRepo: IWorkItemRepository) { }

    async execute(entityId: string, workspaceId: string): Promise<WorkItem[]> {
        return this.workItemRepo.findByEntity(entityId, workspaceId);
    }
}
