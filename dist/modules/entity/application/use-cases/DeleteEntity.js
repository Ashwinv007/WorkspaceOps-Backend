"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteEntity = void 0;
const AppError_1 = require("../../../../shared/domain/errors/AppError");
const ValidationUtils_1 = require("../../../../shared/utils/ValidationUtils");
class DeleteEntity {
    constructor(entityRepo) {
        this.entityRepo = entityRepo;
    }
    async execute(dto) {
        // 1. Validate entity ID format
        if (!(0, ValidationUtils_1.isValidObjectId)(dto.id)) {
            throw new AppError_1.ValidationError('Invalid entity ID format');
        }
        // 2. Validate workspace ID format
        if (!(0, ValidationUtils_1.isValidObjectId)(dto.workspaceId)) {
            throw new AppError_1.ValidationError('Invalid workspace ID format');
        }
        // 3. Validate entity exists
        const existingEntity = await this.entityRepo.findById(dto.id);
        if (!existingEntity) {
            throw new AppError_1.NotFoundError('Entity not found');
        }
        // 4. Verify entity belongs to workspace
        if (existingEntity.workspaceId !== dto.workspaceId) {
            throw new AppError_1.ForbiddenError('Entity does not belong to this workspace');
        }
        // 5. Delete entity
        await this.entityRepo.delete(dto.id);
    }
}
exports.DeleteEntity = DeleteEntity;
