import { DocumentType } from '../../domain/entities/DocumentType';
import { DocumentTypeField } from '../../domain/entities/DocumentTypeField';

/**
 * Document Type Presenter (Interfaces Layer)
 * 
 * Formats document type entities for HTTP responses.
 */
export class DocumentTypePresenter {
    /**
     * Present a single document type with its fields
     */
    presentDocumentType(documentType: DocumentType, fields: DocumentTypeField[]) {
        return {
            success: true,
            data: {
                id: documentType.id,
                workspaceId: documentType.workspaceId,
                name: documentType.name,
                hasMetadata: documentType.hasMetadata,
                hasExpiry: documentType.hasExpiry,
                fields: fields.map(f => this.presentField(f)),
                createdAt: documentType.createdAt?.toISOString()
            }
        };
    }

    /**
     * Present multiple document types with their fields
     */
    presentDocumentTypes(documentTypes: { documentType: DocumentType; fields: DocumentTypeField[] }[]) {
        return {
            success: true,
            data: documentTypes.map(dt => ({
                id: dt.documentType.id,
                workspaceId: dt.documentType.workspaceId,
                name: dt.documentType.name,
                hasMetadata: dt.documentType.hasMetadata,
                hasExpiry: dt.documentType.hasExpiry,
                fields: dt.fields.map(f => this.presentField(f)),
                createdAt: dt.documentType.createdAt?.toISOString()
            }))
        };
    }

    /**
     * Present a single field
     */
    presentField(field: DocumentTypeField) {
        return {
            id: field.id,
            fieldKey: field.fieldKey,
            fieldType: field.fieldType,
            isRequired: field.isRequired,
            isExpiryField: field.isExpiryField
        };
    }
}
