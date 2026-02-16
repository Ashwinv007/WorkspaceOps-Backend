"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateEntity = void 0;
const Entity_1 = require("../../domain/entities/Entity");
const AppError_1 = require("../../../../shared/domain/errors/AppError");
const ValidationUtils_1 = require("../../../../shared/utils/ValidationUtils");
class CreateEntity {
    constructor(entityRepo, workspaceRepo) {
        this.entityRepo = entityRepo;
        this.workspaceRepo = workspaceRepo;
    }
    async execute(dto) {
        // 1. Validate workspace ID format
        if (!(0, ValidationUtils_1.isValidObjectId)(dto.workspaceId)) {
            throw new AppError_1.ValidationError('Invalid workspace ID format');
        }
        // 2. Validate workspace exists
        const workspace = await this.workspaceRepo.findById(dto.workspaceId);
        if (!workspace) {
            throw new AppError_1.NotFoundError('Workspace not found');
        }
        // 3. Validate entity name
        if (!dto.name || dto.name.trim().length === 0) {
            throw new AppError_1.ValidationError('Entity name is required');
        }
        if (dto.name.trim().length > 255) {
            throw new AppError_1.ValidationError('Entity name must not exceed 255 characters');
        }
        // 4. Validate entity role
        if (!Object.values(Entity_1.EntityRole).includes(dto.role)) {
            throw new AppError_1.ValidationError(`Invalid entity role. Must be one of: ${Object.values(Entity_1.EntityRole).join(', ')}`);
        }
        // 5. Create entity
        const entity = await this.entityRepo.create({
            workspaceId: dto.workspaceId,
            name: dto.name.trim(),
            role: dto.role
        });
        return entity;
    }
}
exports.CreateEntity = CreateEntity;
