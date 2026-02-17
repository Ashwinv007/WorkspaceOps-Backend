"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteDocumentType = void 0;
const AppError_1 = require("../../../../shared/domain/errors/AppError");
const ValidationUtils_1 = require("../../../../shared/utils/ValidationUtils");
class DeleteDocumentType {
    constructor(documentTypeRepo) {
        this.documentTypeRepo = documentTypeRepo;
    }
    async execute(input) {
        // 1. Validate ID formats
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
        // 3. Delete document type (cascades to fields)
        await this.documentTypeRepo.delete(input.id);
    }
}
exports.DeleteDocumentType = DeleteDocumentType;
