import { FieldType } from '../../domain/enums/FieldType';

/**
 * DTO for creating a new document type
 */
export interface CreateDocumentTypeDTO {
    workspaceId: string;
    name: string;
    hasMetadata: boolean;
    hasExpiry: boolean;
    fields: {
        fieldKey: string;
        fieldType: FieldType;
        isRequired: boolean;
        isExpiryField: boolean;
    }[];
}

/**
 * DTO for updating a document type
 */
export interface UpdateDocumentTypeDTO {
    id: string;
    workspaceId: string;
    name?: string;
    hasMetadata?: boolean;
    hasExpiry?: boolean;
}

/**
 * DTO for adding a field to a document type
 */
export interface AddFieldDTO {
    documentTypeId: string;
    workspaceId: string;
    fieldKey: string;
    fieldType: FieldType;
    isRequired: boolean;
    isExpiryField: boolean;
}
