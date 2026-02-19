import { WorkItemType } from '../entities/WorkItemType';

/**
 * WorkItemType Repository Interface
 * 
 * Defines the contract for work item type data access operations.
 * Infrastructure layer will implement this interface.
 */
export interface IWorkItemTypeRepository {
    /**
     * Create a new work item type
     */
    create(type: Omit<WorkItemType, 'id' | 'createdAt'>): Promise<WorkItemType>;

    /**
     * Find work item type by ID within a workspace
     */
    findById(id: string, workspaceId: string): Promise<WorkItemType | null>;

    /**
     * Find all work item types in a workspace
     */
    findByWorkspace(workspaceId: string): Promise<WorkItemType[]>;

    /**
     * Find work item type by name within a workspace (for duplicate checking)
     */
    findByName(name: string, workspaceId: string): Promise<WorkItemType | null>;

    /**
     * Delete a work item type
     */
    delete(id: string, workspaceId: string): Promise<boolean>;

    /**
     * Count total work item types in a workspace (for overview)
     */
    countByWorkspace(workspaceId: string): Promise<number>;
}
