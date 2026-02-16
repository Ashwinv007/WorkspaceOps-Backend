"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetEntities = void 0;
const AppError_1 = require("../../../../shared/domain/errors/AppError");
const ValidationUtils_1 = require("../../../../shared/utils/ValidationUtils");
class GetEntities {
    constructor(entityRepo) {
        this.entityRepo = entityRepo;
    }
    async execute(dto) {
        // 1. Validate workspace ID format
        if (!(0, ValidationUtils_1.isValidObjectId)(dto.workspaceId)) {
            throw new AppError_1.ValidationError('Invalid workspace ID format');
        }
        // 2. Get all entities for workspace
        const entities = await this.entityRepo.findByWorkspaceId(dto.workspaceId);
        return entities;
    }
}
exports.GetEntities = GetEntities;
