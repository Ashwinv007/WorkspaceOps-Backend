import { DocumentType } from '../entities/DocumentType';
import { DocumentTypeField } from '../entities/DocumentTypeField';

/**
 * DocumentType Repository Interface (Domain Layer)
 * 
 * Defines the contract for document type persistence operations.
 * Infrastructure layer will implement this interface.
 */
export interface IDocumentTypeRepository {
    /**
     * Create a new document type with fields
     * This should be a transactional operation
     */
    create(
        documentType: Omit<DocumentType, 'id' | 'createdAt'>,
        fields: Omit<DocumentTypeField, 'id' | 'documentTypeId'>[]
    ): Promise<DocumentType>;

    /**
     * Find document type by ID (without fields)
     */
    findById(id: string): Promise<DocumentType | null>;

    /**
     * Find all document types in a workspace (without fields)
     */
    findByWorkspaceId(workspaceId: string): Promise<DocumentType[]>;

    /**
     * Find document type by ID with all its fields
     */
    findByIdWithFields(id: string): Promise<{
        documentType: DocumentType;
        fields: DocumentTypeField[];
    } | null>;

    /**
     * Update document type metadata
     */
    update(
        id: string,
        updates: Partial<Pick<DocumentType, 'name' | 'hasMetadata' | 'hasExpiry'>>
    ): Promise<DocumentType>;

    /**
     * Delete document type and all its fields
     */
    delete(id: string): Promise<void>;

    /**
     * Add a new field to an existing document type
     */
    addField(
        documentTypeId: string,
        field: Omit<DocumentTypeField, 'id' | 'documentTypeId'>
    ): Promise<DocumentTypeField>;

    /**
     * Update a field
     */
    updateField(
        fieldId: string,
        updates: Partial<Omit<DocumentTypeField, 'id' | 'documentTypeId'>>
    ): Promise<DocumentTypeField>;

    /**
     * Delete a field
     */
    deleteField(fieldId: string): Promise<void>;

    /**
     * Get all fields for a document type
     */
    getFields(documentTypeId: string): Promise<DocumentTypeField[]>;
}
