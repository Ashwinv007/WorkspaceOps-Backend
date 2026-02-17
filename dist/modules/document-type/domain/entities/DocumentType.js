"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentType = void 0;
const AppError_1 = require("../../../../shared/domain/errors/AppError");
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
class DocumentType {
    constructor(id, workspaceId, name, hasMetadata = false, hasExpiry = false, createdAt) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.name = name;
        this.hasMetadata = hasMetadata;
        this.hasExpiry = hasExpiry;
        this.createdAt = createdAt;
        this.validate();
    }
    validate() {
        // Validate workspaceId
        if (!this.workspaceId || !this.workspaceId.trim()) {
            throw new AppError_1.ValidationError('Workspace ID is required');
        }
        // Validate name
        if (!this.name || !this.name.trim()) {
            throw new AppError_1.ValidationError('Document type name is required');
        }
        if (this.name.trim().length > 255) {
            throw new AppError_1.ValidationError('Document type name must not exceed 255 characters');
        }
    }
    /**
     * Factory method for creating new document types (without id)
     */
    static create(workspaceId, name, hasMetadata = false, hasExpiry = false) {
        const tempDocType = new DocumentType('temp', workspaceId, name.trim(), hasMetadata, hasExpiry);
        return {
            workspaceId: tempDocType.workspaceId,
            name: tempDocType.name,
            hasMetadata: tempDocType.hasMetadata,
            hasExpiry: tempDocType.hasExpiry,
            validate: tempDocType.validate.bind(tempDocType)
        };
    }
}
exports.DocumentType = DocumentType;
