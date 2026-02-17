"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetDocumentTypeById = void 0;
const AppError_1 = require("../../../../shared/domain/errors/AppError");
const ValidationUtils_1 = require("../../../../shared/utils/ValidationUtils");
class GetDocumentTypeById {
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
        // 2. Fetch document type with fields
        const result = await this.documentTypeRepo.findByIdWithFields(input.id);
        if (!result) {
            throw new AppError_1.NotFoundError('Document type not found');
        }
        // 3. Verify belongs to specified workspace
        if (result.documentType.workspaceId !== input.workspaceId) {
            throw new AppError_1.NotFoundError('Document type not found in this workspace');
        }
        return result;
    }
}
exports.GetDocumentTypeById = GetDocumentTypeById;
