import { ValidationError } from '../../../../shared/domain/errors/AppError';
import { FieldType } from '../enums/FieldType';

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
export class DocumentTypeField {
    constructor(
        public readonly id: string,
        public readonly documentTypeId: string,
        public readonly fieldKey: string,
        public readonly fieldType: FieldType,
        public readonly isRequired: boolean = false,
        public readonly isExpiryField: boolean = false
    ) {
        this.validate();
    }

    private validate(): void {
        // Validate documentTypeId
        if (!this.documentTypeId || !this.documentTypeId.trim()) {
            throw new ValidationError('Document type ID is required');
        }

        // Validate fieldKey
        if (!this.fieldKey || !this.fieldKey.trim()) {
            throw new ValidationError('Field key is required');
        }

        if (this.fieldKey.trim().length > 100) {
            throw new ValidationError('Field key must not exceed 100 characters');
        }

        // Field key must be alphanumeric with underscores only
        const fieldKeyRegex = /^[a-zA-Z0-9_]+$/;
        if (!fieldKeyRegex.test(this.fieldKey.trim())) {
            throw new ValidationError('Field key must contain only alphanumeric characters and underscores');
        }

        // Validate fieldType
        if (!Object.values(FieldType).includes(this.fieldType)) {
            throw new ValidationError(
                `Invalid field type. Must be one of: ${Object.values(FieldType).join(', ')}`
            );
        }

        // Business rule: Only date fields can be marked as expiry field
        if (this.isExpiryField && this.fieldType !== FieldType.DATE) {
            throw new ValidationError('Expiry field must be a date field');
        }
    }

    /**
     * Factory method for creating new fields (without id)
     */
    static create(
        documentTypeId: string,
        fieldKey: string,
        fieldType: FieldType,
        isRequired: boolean = false,
        isExpiryField: boolean = false
    ): Omit<DocumentTypeField, 'id'> {
        const tempField = new DocumentTypeField(
            'temp',
            documentTypeId,
            fieldKey.trim(),
            fieldType,
            isRequired,
            isExpiryField
        );

        return {
            documentTypeId: tempField.documentTypeId,
            fieldKey: tempField.fieldKey,
            fieldType: tempField.fieldType,
            isRequired: tempField.isRequired,
            isExpiryField: tempField.isExpiryField,
            validate: tempField.validate.bind(tempField)
        } as any;
    }
}
