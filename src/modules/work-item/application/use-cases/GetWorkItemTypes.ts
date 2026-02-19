import { IWorkItemTypeRepository } from '../../domain/repositories/IWorkItemTypeRepository';
import { WorkItemType } from '../../domain/entities/WorkItemType';

/**
 * GetWorkItemTypes Use Case
 * 
 * Retrieves all work item types for a workspace.
 */
export class GetWorkItemTypes {
    constructor(private workItemTypeRepo: IWorkItemTypeRepository) { }

    async execute(workspaceId: string): Promise<WorkItemType[]> {
        return this.workItemTypeRepo.findByWorkspace(workspaceId);
    }
}
