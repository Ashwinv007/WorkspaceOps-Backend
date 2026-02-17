import { IDocumentTypeRepository } from '../../domain/repositories/IDocumentTypeRepository';
import { DocumentTypeField } from '../../domain/entities/DocumentTypeField';
import { FieldType } from '../../domain/enums/FieldType';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/AppError';
import { isValidObjectId } from '../../../../shared/utils/ValidationUtils';

/**
 * Add Field Use Case (Application Layer)
 * 
 * Adds a new metadata field to an existing document type.
 * Validates business rules for expiry fields.
 */

export interface AddFieldInput {
    documentTypeId: string;
    workspaceId: string;
    fieldKey: string;
    fieldType: FieldType;
    isRequired: boolean;
    isExpiryField: boolean;
}

export class AddField {
    constructor(
        private readonly documentTypeRepo: IDocumentTypeRepository
    ) { }

    async execute(input: AddFieldInput): Promise<DocumentTypeField> {
        // 1. Validate ID formats
        if (!isValidObjectId(input.documentTypeId)) {
            throw new ValidationError('Invalid document type ID format');
        }

        if (!isValidObjectId(input.workspaceId)) {
            throw new ValidationError('Invalid workspace ID format');
        }

        // 2. Verify document type exists and belongs to workspace
        const existing = await this.documentTypeRepo.findByIdWithFields(input.documentTypeId);
        if (!existing) {
            throw new NotFoundError('Document type not found');
        }

        if (existing.documentType.workspaceId !== input.workspaceId) {
            throw new NotFoundError('Document type not found in this workspace');
        }

        // 3. Validate no duplicate field key
        const duplicateField = existing.fields.find(
            f => f.fieldKey.toLowerCase() === input.fieldKey.toLowerCase()
        );
        if (duplicateField) {
            throw new ValidationError(`Field with key '${input.fieldKey}' already exists`);
        }

        // 4. Validate expiry field requirements
        if (input.isExpiryField) {
            // Expiry field must be date type
            if (input.fieldType !== FieldType.DATE) {
                throw new ValidationError('Expiry field must be of type date');
            }

            // Document type must have expiry enabled
            if (!existing.documentType.hasExpiry) {
                throw new ValidationError(
                    'Cannot add expiry field to document type without expiry tracking enabled. Enable hasExpiry first.'
                );
            }
        }

        // 5. Prepare field data (don't create entity yet - will be created by repository)
        const fieldData = {
            fieldKey: input.fieldKey.trim(),
            fieldType: input.fieldType,
            isRequired: input.isRequired,
            isExpiryField: input.isExpiryField
        };

        // 6. Validate field data manually (since we're not using entity constructor)
        if (input.isExpiryField && input.fieldType !== FieldType.DATE) {
            throw new ValidationError('Expiry field must be of type date');
        }

        // 7. Add field to document type
        const createdField = await this.documentTypeRepo.addField(input.documentTypeId, fieldData);

        return createdField;
    }
}
