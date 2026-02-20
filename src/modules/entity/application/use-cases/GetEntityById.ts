import { IEntityRepository } from '../../domain/repositories/IEntityRepository';
import { Entity } from '../../domain/entities/Entity';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/AppError';
import { isValidObjectId } from '../../../../shared/utils/ValidationUtils';

export interface GetEntityByIdDTO {
    id: string;
    workspaceId: string;
}

export class GetEntityById {
    constructor(private readonly entityRepo: IEntityRepository) {}

    async execute(dto: GetEntityByIdDTO): Promise<Entity> {
        if (!isValidObjectId(dto.id)) {
            throw new ValidationError('Invalid entity ID format');
        }

        if (!isValidObjectId(dto.workspaceId)) {
            throw new ValidationError('Invalid workspace ID format');
        }

        const entity = await this.entityRepo.findById(dto.id);

        if (!entity || entity.workspaceId !== dto.workspaceId) {
            throw new NotFoundError('Entity not found');
        }

        return entity;
    }
}
