import { IEntityRepository } from '../../domain/repositories/IEntityRepository';
import { Entity } from '../../domain/entities/Entity';
import { ValidationError } from '../../../../shared/domain/errors/AppError';
import { isValidObjectId } from '../../../../shared/utils/ValidationUtils';

/**
 * Get Entities Use Case (Application Layer)
 * 
 * Retrieves all entities for a given workspace.
 */

export interface GetEntitiesDTO {
    workspaceId: string;
}

export class GetEntities {
    constructor(
        private readonly entityRepo: IEntityRepository
    ) { }

    async execute(dto: GetEntitiesDTO): Promise<Entity[]> {
        // 1. Validate workspace ID format
        if (!isValidObjectId(dto.workspaceId)) {
            throw new ValidationError('Invalid workspace ID format');
        }

        // 2. Get all entities for workspace
        const entities = await this.entityRepo.findByWorkspaceId(dto.workspaceId);

        return entities;
    }
}
