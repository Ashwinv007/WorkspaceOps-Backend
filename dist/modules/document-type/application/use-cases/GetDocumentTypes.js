"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetDocumentTypes = void 0;
const AppError_1 = require("../../../../shared/domain/errors/AppError");
const ValidationUtils_1 = require("../../../../shared/utils/ValidationUtils");
class GetDocumentTypes {
    constructor(documentTypeRepo) {
        this.documentTypeRepo = documentTypeRepo;
    }
    async execute(input) {
        // 1. Validate workspace ID format
        if (!(0, ValidationUtils_1.isValidObjectId)(input.workspaceId)) {
            throw new AppError_1.ValidationError('Invalid workspace ID format');
        }
        // 2. Fetch all document types for workspace (without fields)
        const documentTypes = await this.documentTypeRepo.findByWorkspaceId(input.workspaceId);
        // 3. Fetch fields for each document type
        const results = await Promise.all(documentTypes.map(async (docType) => {
            const fields = await this.documentTypeRepo.getFields(docType.id);
            return {
                documentType: docType,
                fields
            };
        }));
        return results;
    }
}
exports.GetDocumentTypes = GetDocumentTypes;
