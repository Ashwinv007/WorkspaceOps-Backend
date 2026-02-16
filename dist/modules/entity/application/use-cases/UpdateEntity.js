"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateEntity = void 0;
const Entity_1 = require("../../domain/entities/Entity");
const AppError_1 = require("../../../../shared/domain/errors/AppError");
const ValidationUtils_1 = require("../../../../shared/utils/ValidationUtils");
class UpdateEntity {
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
        // 5. Validate updates
        const updates = {};
        if (dto.name !== undefined) {
            if (!dto.name || dto.name.trim().length === 0) {
                throw new AppError_1.ValidationError('Entity name cannot be empty');
            }
            if (dto.name.trim().length > 255) {
                throw new AppError_1.ValidationError('Entity name must not exceed 255 characters');
            }
            updates.name = dto.name.trim();
        }
        if (dto.role !== undefined) {
            if (!Object.values(Entity_1.EntityRole).includes(dto.role)) {
                throw new AppError_1.ValidationError(`Invalid entity role. Must be one of: ${Object.values(Entity_1.EntityRole).join(', ')}`);
            }
            updates.role = dto.role;
        }
        // 6. Ensure at least one field is being updated
        if (Object.keys(updates).length === 0) {
            throw new AppError_1.ValidationError('No fields to update');
        }
        // 7. Update entity
        const updatedEntity = await this.entityRepo.update(dto.id, updates);
        return updatedEntity;
    }
}
exports.UpdateEntity = UpdateEntity;
