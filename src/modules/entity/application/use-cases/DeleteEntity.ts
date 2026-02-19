import { IEntityRepository } from '../../domain/repositories/IEntityRepository';
import { NotFoundError, ValidationError, ForbiddenError } from '../../../../shared/domain/errors/AppError';
import { isValidObjectId } from '../../../../shared/utils/ValidationUtils';
import { IAuditLogService } from '../../../audit-log/application/services/IAuditLogService';
import { AuditAction } from '../../../audit-log/domain/enums/AuditAction';

/**
 * Delete Entity Use Case (Application Layer)
 * 
 * Deletes an entity from a workspace.
 * Validates entity exists and belongs to the specified workspace.
 */

export interface DeleteEntityDTO {
    id: string;
    workspaceId: string;
    userId: string;
}

export class DeleteEntity {
    constructor(
        private readonly entityRepo: IEntityRepository,
        private readonly auditLogService?: IAuditLogService
    ) { }

    async execute(dto: DeleteEntityDTO): Promise<void> {
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

        // 5. Delete entity
        await this.entityRepo.delete(dto.id);

        // 6. Audit log (fire-and-forget)
        await this.auditLogService?.log({
            workspaceId: dto.workspaceId,
            userId: dto.userId,
            action: AuditAction.ENTITY_DELETED,
            targetType: 'Entity',
            targetId: dto.id,
        });
    }
}
