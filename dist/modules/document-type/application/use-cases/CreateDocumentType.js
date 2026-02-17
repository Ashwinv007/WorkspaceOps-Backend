"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateDocumentType = void 0;
const DocumentType_1 = require("../../domain/entities/DocumentType");
const FieldType_1 = require("../../domain/enums/FieldType");
const AppError_1 = require("../../../../shared/domain/errors/AppError");
const ValidationUtils_1 = require("../../../../shared/utils/ValidationUtils");
class CreateDocumentType {
    constructor(documentTypeRepo, workspaceRepo) {
        this.documentTypeRepo = documentTypeRepo;
        this.workspaceRepo = workspaceRepo;
    }
    async execute(input) {
        // 1. Validate workspace ID format
        if (!(0, ValidationUtils_1.isValidObjectId)(input.workspaceId)) {
            throw new AppError_1.ValidationError('Invalid workspace ID format');
        }
        // 2. Validate workspace exists
        const workspace = await this.workspaceRepo.findById(input.workspaceId);
        if (!workspace) {
            throw new AppError_1.NotFoundError('Workspace not found');
        }
        // 3. Validate document type name
        if (!input.name || input.name.trim().length === 0) {
            throw new AppError_1.ValidationError('Document type name is required');
        }
        if (input.name.trim().length > 255) {
            throw new AppError_1.ValidationError('Document type name must not exceed 255 characters');
        }
        // 4. Validate fields if hasMetadata is true
        if (input.hasMetadata && (!input.fields || input.fields.length === 0)) {
            throw new AppError_1.ValidationError('Document type with metadata must have at least one field');
        }
        // 5. Validate expiry field requirement
        if (input.hasExpiry) {
            const hasExpiryField = input.fields.some(f => f.isExpiryField);
            if (!hasExpiryField) {
                throw new AppError_1.ValidationError('Document type with expiry tracking must have at least one expiry field');
            }
            // Validate all expiry fields are date type
            const invalidExpiryFields = input.fields.filter(f => f.isExpiryField && f.fieldType !== FieldType_1.FieldType.DATE);
            if (invalidExpiryFields.length > 0) {
                throw new AppError_1.ValidationError('Expiry fields must be of type date');
            }
        }
        // 6. Validate no duplicate field keys
        const fieldKeys = input.fields.map(f => f.fieldKey.toLowerCase());
        const uniqueKeys = new Set(fieldKeys);
        if (fieldKeys.length !== uniqueKeys.size) {
            throw new AppError_1.ValidationError('Duplicate field keys are not allowed');
        }
        // 7. Create document type entity
        const documentType = DocumentType_1.DocumentType.create(input.workspaceId, input.name.trim(), input.hasMetadata, input.hasExpiry);
        // 8. Prepare field data (don't create entities yet - documentTypeId not known)
        const fieldData = input.fields.map(f => ({
            fieldKey: f.fieldKey.trim(),
            fieldType: f.fieldType,
            isRequired: f.isRequired,
            isExpiryField: f.isExpiryField
        }));
        // 9. Persist to database (atomic transaction)
        const createdDocType = await this.documentTypeRepo.create(documentType, fieldData);
        // 10. Fetch with fields
        const result = await this.documentTypeRepo.findByIdWithFields(createdDocType.id);
        if (!result) {
            throw new Error('Failed to retrieve created document type');
        }
        return result;
    }
}
exports.CreateDocumentType = CreateDocumentType;
