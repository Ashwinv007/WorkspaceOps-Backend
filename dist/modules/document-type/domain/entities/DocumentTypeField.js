"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentTypeField = void 0;
const AppError_1 = require("../../../../shared/domain/errors/AppError");
const FieldType_1 = require("../enums/FieldType");
/**
 * DocumentTypeField Domain Entity
 *
 * Represents a metadata field definition for a document type.
 *
 * Maps to SQL table:
 * CREATE TABLE document_type_fields (
 *   id UUID PRIMARY KEY,
 *   document_type_id UUID NOT NULL REFERENCES document_types(id),
 *   field_key VARCHAR(100) NOT NULL,
 *   field_type VARCHAR(20) NOT NULL CHECK (field_type IN ('text', 'date')),
 *   is_required BOOLEAN DEFAULT FALSE,
 *   is_expiry_field BOOLEAN DEFAULT FALSE
 * );
 */
class DocumentTypeField {
    constructor(id, documentTypeId, fieldKey, fieldType, isRequired = false, isExpiryField = false) {
        this.id = id;
        this.documentTypeId = documentTypeId;
        this.fieldKey = fieldKey;
        this.fieldType = fieldType;
        this.isRequired = isRequired;
        this.isExpiryField = isExpiryField;
        this.validate();
    }
    validate() {
        // Validate documentTypeId
        if (!this.documentTypeId || !this.documentTypeId.trim()) {
            throw new AppError_1.ValidationError('Document type ID is required');
        }
        // Validate fieldKey
        if (!this.fieldKey || !this.fieldKey.trim()) {
            throw new AppError_1.ValidationError('Field key is required');
        }
        if (this.fieldKey.trim().length > 100) {
            throw new AppError_1.ValidationError('Field key must not exceed 100 characters');
        }
        // Field key must be alphanumeric with underscores only
        const fieldKeyRegex = /^[a-zA-Z0-9_]+$/;
        if (!fieldKeyRegex.test(this.fieldKey.trim())) {
            throw new AppError_1.ValidationError('Field key must contain only alphanumeric characters and underscores');
        }
        // Validate fieldType
        if (!Object.values(FieldType_1.FieldType).includes(this.fieldType)) {
            throw new AppError_1.ValidationError(`Invalid field type. Must be one of: ${Object.values(FieldType_1.FieldType).join(', ')}`);
        }
        // Business rule: Only date fields can be marked as expiry field
        if (this.isExpiryField && this.fieldType !== FieldType_1.FieldType.DATE) {
            throw new AppError_1.ValidationError('Expiry field must be a date field');
        }
    }
    /**
     * Factory method for creating new fields (without id)
     */
    static create(documentTypeId, fieldKey, fieldType, isRequired = false, isExpiryField = false) {
        const tempField = new DocumentTypeField('temp', documentTypeId, fieldKey.trim(), fieldType, isRequired, isExpiryField);
        return {
            documentTypeId: tempField.documentTypeId,
            fieldKey: tempField.fieldKey,
            fieldType: tempField.fieldType,
            isRequired: tempField.isRequired,
            isExpiryField: tempField.isExpiryField,
            validate: tempField.validate.bind(tempField)
        };
    }
}
exports.DocumentTypeField = DocumentTypeField;
