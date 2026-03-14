import { IEntityRepository } from '../../domain/repositories/IEntityRepository';
import { IWorkspaceRepository } from '../../../workspace/domain/repositories/IWorkspaceRepository';
import { Entity, EntityRole } from '../../domain/entities/Entity';
import { NotFoundError, ValidationError, ConflictError } from '../../../../shared/domain/errors/AppError';
import { isValidObjectId } from '../../../../shared/utils/ValidationUtils';
import { IAuditLogService } from '../../../audit-log/application/services/IAuditLogService';
import { AuditAction } from '../../../audit-log/domain/enums/AuditAction';

/**
 * Create Entity Use Case (Application Layer)
 * 
 * Creates a new entity within a workspace.
 * Validates workspace exists before creating entity.
 */

export interface CreateEntityDTO {
    workspaceId: string;
    userId: string;
    name: string;
    role: EntityRole;
    parentId?: string;
}

export class CreateEntity {
    constructor(
        private readonly entityRepo: IEntityRepository,
        private readonly workspaceRepo: IWorkspaceRepository,
        private readonly auditLogService?: IAuditLogService
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

        // 5. Enforce at most one SELF entity per workspace
        if (dto.role === EntityRole.SELF) {
            const existing = await this.entityRepo.findByWorkspaceIdFiltered(dto.workspaceId, EntityRole.SELF);
            if (existing.length > 0) {
                throw new ConflictError('A SELF entity already exists in this workspace.');
            }
        }

        // 6. Validate parent entity role — parent cannot be EMPLOYEE
        if (dto.parentId) {
            const parent = await this.entityRepo.findById(dto.parentId);
            if (!parent) {
                throw new NotFoundError('Parent entity not found');
            }
            if (parent.role === EntityRole.EMPLOYEE) {
                throw new ValidationError('Parent entity cannot be an EMPLOYEE.');
            }
        }

        // 7. Create entity
        const entity = await this.entityRepo.create({
            workspaceId: dto.workspaceId,
            name: dto.name.trim(),
            role: dto.role,
            parentId: dto.parentId
        });

        // 8. Audit log (fire-and-forget)
        await this.auditLogService?.log({
            workspaceId: dto.workspaceId,
            userId: dto.userId,
            action: AuditAction.ENTITY_CREATED,
            targetType: 'Entity',
            targetId: entity.id,
        });

        return entity;
    }
}
