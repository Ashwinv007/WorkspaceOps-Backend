import { WorkItemDocument } from '../entities/WorkItemDocument';

/**
 * WorkItemDocument Repository Interface
 * 
 * Defines the contract for work item ↔ document linking operations.
 * Uses a separate collection (per MongoDB schema design).
 */
export interface IWorkItemDocumentRepository {
    /**
     * Link a document to a work item
     */
    link(workItemId: string, documentId: string): Promise<WorkItemDocument>;

    /**
     * Unlink a document from a work item
     */
    unlink(workItemId: string, documentId: string): Promise<boolean>;

    /**
     * Find all document links for a work item
     */
    findByWorkItem(workItemId: string): Promise<WorkItemDocument[]>;

    /**
     * Check if a document is already linked to a work item
     */
    exists(workItemId: string, documentId: string): Promise<boolean>;

    /**
     * Delete all document links for a work item (cleanup on work item deletion)
     */
    deleteByWorkItem(workItemId: string): Promise<number>;
}
