"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentTypePresenter = void 0;
/**
 * Document Type Presenter (Interfaces Layer)
 *
 * Formats document type entities for HTTP responses.
 */
class DocumentTypePresenter {
    /**
     * Present a single document type with its fields
     */
    presentDocumentType(documentType, fields) {
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
    presentDocumentTypes(documentTypes) {
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
    presentField(field) {
        return {
            id: field.id,
            fieldKey: field.fieldKey,
            fieldType: field.fieldType,
            isRequired: field.isRequired,
            isExpiryField: field.isExpiryField
        };
    }
}
exports.DocumentTypePresenter = DocumentTypePresenter;
