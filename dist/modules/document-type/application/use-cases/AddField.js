"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddField = void 0;
const FieldType_1 = require("../../domain/enums/FieldType");
const AppError_1 = require("../../../../shared/domain/errors/AppError");
const ValidationUtils_1 = require("../../../../shared/utils/ValidationUtils");
class AddField {
    constructor(documentTypeRepo) {
        this.documentTypeRepo = documentTypeRepo;
    }
    async execute(input) {
        // 1. Validate ID formats
        if (!(0, ValidationUtils_1.isValidObjectId)(input.documentTypeId)) {
            throw new AppError_1.ValidationError('Invalid document type ID format');
        }
        if (!(0, ValidationUtils_1.isValidObjectId)(input.workspaceId)) {
            throw new AppError_1.ValidationError('Invalid workspace ID format');
        }
        // 2. Verify document type exists and belongs to workspace
        const existing = await this.documentTypeRepo.findByIdWithFields(input.documentTypeId);
        if (!existing) {
            throw new AppError_1.NotFoundError('Document type not found');
        }
        if (existing.documentType.workspaceId !== input.workspaceId) {
            throw new AppError_1.NotFoundError('Document type not found in this workspace');
        }
        // 3. Validate no duplicate field key
        const duplicateField = existing.fields.find(f => f.fieldKey.toLowerCase() === input.fieldKey.toLowerCase());
        if (duplicateField) {
            throw new AppError_1.ValidationError(`Field with key '${input.fieldKey}' already exists`);
        }
        // 4. Validate expiry field requirements
        if (input.isExpiryField) {
            // Expiry field must be date type
            if (input.fieldType !== FieldType_1.FieldType.DATE) {
                throw new AppError_1.ValidationError('Expiry field must be of type date');
            }
            // Document type must have expiry enabled
            if (!existing.documentType.hasExpiry) {
                throw new AppError_1.ValidationError('Cannot add expiry field to document type without expiry tracking enabled. Enable hasExpiry first.');
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
        if (input.isExpiryField && input.fieldType !== FieldType_1.FieldType.DATE) {
            throw new AppError_1.ValidationError('Expiry field must be of type date');
        }
        // 7. Add field to document type
        const createdField = await this.documentTypeRepo.addField(input.documentTypeId, fieldData);
        return createdField;
    }
}
exports.AddField = AddField;
