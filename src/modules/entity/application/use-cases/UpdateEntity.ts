import { IEntityRepository } from '../../domain/repositories/IEntityRepository';
import { Entity, EntityRole } from '../../domain/entities/Entity';
import { NotFoundError, ValidationError, ForbiddenError } from '../../../../shared/domain/errors/AppError';
import { isValidObjectId } from '../../../../shared/utils/ValidationUtils';
import { IAuditLogService } from '../../../audit-log/application/services/IAuditLogService';
import { AuditAction } from '../../../audit-log/domain/enums/AuditAction';

/**
 * Update Entity Use Case (Application Layer)
 * 
 * Updates an existing entity's name and/or role.
 * Validates entity exists and belongs to the specified workspace.
 */

export interface UpdateEntityDTO {
    id: string;
    workspaceId: string;
    userId: string;
    name?: string;
    role?: EntityRole;
}

export class UpdateEntity {
    constructor(
        private readonly entityRepo: IEntityRepository,
        private readonly auditLogService?: IAuditLogService
    ) { }

    async execute(dto: UpdateEntityDTO): Promise<Entity> {
        // 1. Validate entity ID format
        if (!isValidObjectId(dto.id)) {
            throw new ValidationError('Invalid entity ID format');
        }

        // 2. Validate workspace ID format
        if (!isValidObjectId(dto.workspaceId)) {
            throw new ValidationError('Invalid workspace ID format');
        }

        // 3. Validate entity exists
        const existingEntity = await this.entityRepo.findById(dto.id);
        if (!existingEntity) {
            throw new NotFoundError('Entity not found');
        }

        // 4. Verify entity belongs to workspace
        if (existingEntity.workspaceId !== dto.workspaceId) {
            throw new ForbiddenError('Entity does not belong to this workspace');
        }

        // 5. Validate updates
        const updates: { name?: string; role?: EntityRole } = {};

        if (dto.name !== undefined) {
            if (!dto.name || dto.name.trim().length === 0) {
                throw new ValidationError('Entity name cannot be empty');
            }
            if (dto.name.trim().length > 255) {
                throw new ValidationError('Entity name must not exceed 255 characters');
            }
            updates.name = dto.name.trim();
        }

        if (dto.role !== undefined) {
            if (!Object.values(EntityRole).includes(dto.role)) {
                throw new ValidationError(
                    `Invalid entity role. Must be one of: ${Object.values(EntityRole).join(', ')}`
                );
            }
            updates.role = dto.role;
        }

        // 6. Ensure at least one field is being updated
        if (Object.keys(updates).length === 0) {
            throw new ValidationError('No fields to update');
        }

        // 7. Update entity
        const updatedEntity = await this.entityRepo.update(dto.id, updates);

        // 8. Audit log (fire-and-forget)
        await this.auditLogService?.log({
            workspaceId: dto.workspaceId,
            userId: dto.userId,
            action: AuditAction.ENTITY_UPDATED,
            targetType: 'Entity',
            targetId: dto.id,
        });

        return updatedEntity;
    }
}
