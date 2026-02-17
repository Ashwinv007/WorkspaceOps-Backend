"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateDocumentType = void 0;
const AppError_1 = require("../../../../shared/domain/errors/AppError");
const ValidationUtils_1 = require("../../../../shared/utils/ValidationUtils");
class UpdateDocumentType {
    constructor(documentTypeRepo) {
        this.documentTypeRepo = documentTypeRepo;
    }
    async execute(input) {
        // 1. Validate ID format
        if (!(0, ValidationUtils_1.isValidObjectId)(input.id)) {
            throw new AppError_1.ValidationError('Invalid document type ID format');
        }
        if (!(0, ValidationUtils_1.isValidObjectId)(input.workspaceId)) {
            throw new AppError_1.ValidationError('Invalid workspace ID format');
        }
        // 2. Verify document type exists and belongs to workspace
        const existing = await this.documentTypeRepo.findByIdWithFields(input.id);
        if (!existing) {
            throw new AppError_1.NotFoundError('Document type not found');
        }
        if (existing.documentType.workspaceId !== input.workspaceId) {
            throw new AppError_1.NotFoundError('Document type not found in this workspace');
        }
        // 3. Validate name if provided
        if (input.name !== undefined) {
            if (!input.name || input.name.trim().length === 0) {
                throw new AppError_1.ValidationError('Document type name cannot be empty');
            }
            if (input.name.trim().length > 255) {
                throw new AppError_1.ValidationError('Document type name must not exceed 255 characters');
            }
        }
        // 4. Validate expiry field requirement if enabling hasExpiry
        if (input.hasExpiry === true && !existing.documentType.hasExpiry) {
            const hasExpiryField = existing.fields.some(f => f.isExpiryField);
            if (!hasExpiryField) {
                throw new AppError_1.ValidationError('Cannot enable expiry tracking without at least one expiry field. Add an expiry field first.');
            }
        }
        // 5. Build updates object
        const updates = {};
        if (input.name !== undefined)
            updates.name = input.name.trim();
        if (input.hasMetadata !== undefined)
            updates.hasMetadata = input.hasMetadata;
        if (input.hasExpiry !== undefined)
            updates.hasExpiry = input.hasExpiry;
        // 6. Update document type
        const updatedDocType = await this.documentTypeRepo.update(input.id, updates);
        // 7. Fetch with fields
        const result = await this.documentTypeRepo.findByIdWithFields(input.id);
        if (!result) {
            throw new AppError_1.NotFoundError('Document type not found after update');
        }
        return result;
    }
}
exports.UpdateDocumentType = UpdateDocumentType;
