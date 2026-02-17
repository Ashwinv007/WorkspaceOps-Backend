import { ValidationError } from '../../../../shared/domain/errors/AppError';

/**
 * DocumentType Domain Entity
 * 
 * Represents a document type configuration within a workspace.
 * Document types define the structure and metadata fields for documents.
 * 
 * Maps to SQL table:
 * CREATE TABLE document_types (
 *   id UUID PRIMARY KEY,
 *   workspace_id UUID NOT NULL REFERENCES workspaces(id),
 *   name VARCHAR(255) NOT NULL,
 *   has_metadata BOOLEAN DEFAULT FALSE,
 *   has_expiry BOOLEAN DEFAULT FALSE
 * );
 */
export class DocumentType {
    constructor(
        public readonly id: string,
        public readonly workspaceId: string,
        public readonly name: string,
        public readonly hasMetadata: boolean = false,
        public readonly hasExpiry: boolean = false,
        public readonly createdAt?: Date
    ) {
        this.validate();
    }

    private validate(): void {
        // Validate workspaceId
        if (!this.workspaceId || !this.workspaceId.trim()) {
            throw new ValidationError('Workspace ID is required');
        }

        // Validate name
        if (!this.name || !this.name.trim()) {
            throw new ValidationError('Document type name is required');
        }

        if (this.name.trim().length > 255) {
            throw new ValidationError('Document type name must not exceed 255 characters');
        }
    }

    /**
     * Factory method for creating new document types (without id)
     */
    static create(
        workspaceId: string,
        name: string,
        hasMetadata: boolean = false,
        hasExpiry: boolean = false
    ): Omit<DocumentType, 'id' | 'createdAt'> {
        const tempDocType = new DocumentType(
            'temp',
            workspaceId,
            name.trim(),
            hasMetadata,
            hasExpiry
        );

        return {
            workspaceId: tempDocType.workspaceId,
            name: tempDocType.name,
            hasMetadata: tempDocType.hasMetadata,
            hasExpiry: tempDocType.hasExpiry,
            validate: tempDocType.validate.bind(tempDocType)
        } as any;
    }
}
