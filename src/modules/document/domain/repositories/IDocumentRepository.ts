import { Document } from '../entities/Document';

/**
 * Document Repository Interface
 * 
 * Defines the contract for document data access operations.
 * Infrastructure layer will implement this interface.
 */
export interface IDocumentRepository {
    /**
     * Create a new document
     */
    create(document: Omit<Document, 'id' | 'createdAt'>): Promise<Document>;

    /**
     * Find document by ID within a workspace
     */
    findById(id: string, workspaceId: string): Promise<Document | null>;

    /**
     * Find all documents in a workspace with optional filters
     */
    findByWorkspace(
        workspaceId: string,
        filters?: {
            documentTypeId?: string;
            entityId?: string;
        }
    ): Promise<Document[]>;

    /**
     * Find all documents linked to a specific entity
     */
    findByEntity(entityId: string, workspaceId: string): Promise<Document[]>;

    /**
       * Find documents expiring within the specified threshold
       * @param workspaceId Workspace to search in
       * @param daysThreshold Number of days from now to consider as "expiring"
       */
    findExpiringDocuments(workspaceId: string, daysThreshold: number): Promise<Document[]>;

    /**
     * Update document metadata or properties
     */
    update(
        id: string,
        workspaceId: string,
        updates: {
            entityId?: string;
            metadata?: Record<string, any>;
            expiryDate?: Date;
        }
    ): Promise<Document | null>;

    /**
     * Delete a document
     */
    delete(id: string, workspaceId: string): Promise<boolean>;

    /**
     * Count total documents in a workspace (for overview)
     */
    countByWorkspace(workspaceId: string): Promise<number>;

    /**
     * Count expiring documents in a workspace (for overview)
     */
    countExpiringDocuments(workspaceId: string, daysThreshold: number): Promise<number>;
}
