import { IWorkItemRepository } from '../../domain/repositories/IWorkItemRepository';
import { WorkItem } from '../../domain/entities/WorkItem';
import { WorkItemFilters } from '../dto/WorkItemDTO';

/**
 * GetWorkItems Use Case
 * 
 * Retrieves work items for a workspace with optional filters.
 */
export class GetWorkItems {
    constructor(private workItemRepo: IWorkItemRepository) { }

    async execute(workspaceId: string, filters?: WorkItemFilters): Promise<WorkItem[]> {
        return this.workItemRepo.findByWorkspace(workspaceId, filters);
    }
}
