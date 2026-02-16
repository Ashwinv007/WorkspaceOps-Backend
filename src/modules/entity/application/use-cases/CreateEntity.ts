import { IEntityRepository } from '../../domain/repositories/IEntityRepository';
import { IWorkspaceRepository } from '../../../workspace/domain/repositories/IWorkspaceRepository';
import { Entity, EntityRole } from '../../domain/entities/Entity';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/AppError';
import { isValidObjectId } from '../../../../shared/utils/ValidationUtils';

/**
 * Create Entity Use Case (Application Layer)
 * 
 * Creates a new entity within a workspace.
 * Validates workspace exists before creating entity.
 */

export interface CreateEntityDTO {
    workspaceId: string;
    name: string;
    role: EntityRole;
}

export class CreateEntity {
    constructor(
        private readonly entityRepo: IEntityRepository,
        private readonly workspaceRepo: IWorkspaceRepository
    ) { }

    async execute(dto: CreateEntityDTO): Promise<Entity> {
        // 1. Validate workspace ID format
        if (!isValidObjectId(dto.workspaceId)) {
            throw new ValidationError('Invalid workspace ID format');
        }

        // 2. Validate workspace exists
        const workspace = await this.workspaceRepo.findById(dto.workspaceId);
        if (!workspace) {
            throw new NotFoundError('Workspace not found');
        }

        // 3. Validate entity name
        if (!dto.name || dto.name.trim().length === 0) {
            throw new ValidationError('Entity name is required');
        }

        if (dto.name.trim().length > 255) {
            throw new ValidationError('Entity name must not exceed 255 characters');
        }

        // 4. Validate entity role
        if (!Object.values(EntityRole).includes(dto.role)) {
            throw new ValidationError(
                `Invalid entity role. Must be one of: ${Object.values(EntityRole).join(', ')}`
            );
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
