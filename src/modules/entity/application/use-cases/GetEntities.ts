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
    role?: string; // Optional filter: CUSTOMER | EMPLOYEE | VENDOR | SELF
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

        // 2. Get entities, optionally filtered by role
        const entities = await this.entityRepo.findByWorkspaceIdFiltered(dto.workspaceId, dto.role);

        return entities;
    }
}
