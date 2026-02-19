import { IWorkItemTypeRepository } from '../../domain/repositories/IWorkItemTypeRepository';
import { WorkItemType } from '../../domain/entities/WorkItemType';
import { CreateWorkItemTypeDTO } from '../dto/WorkItemDTO';
import { ValidationError } from '../../../../shared/domain/errors/AppError';
import { IAuditLogService } from '../../../audit-log/application/services/IAuditLogService';
import { AuditAction } from '../../../audit-log/domain/enums/AuditAction';

/**
 * CreateWorkItemType Use Case
 * 
 * Creates a new work item type within a workspace.
 * Validates name uniqueness before creation.
 */
export class CreateWorkItemType {
    constructor(
        private workItemTypeRepo: IWorkItemTypeRepository,
        private auditLogService?: IAuditLogService
    ) { }

    async execute(dto: CreateWorkItemTypeDTO): Promise<WorkItemType> {
        // 1. Check for duplicate name in workspace
        const existing = await this.workItemTypeRepo.findByName(dto.name, dto.workspaceId);
        if (existing) {
            throw new ValidationError('Work item type with this name already exists in this workspace');
        }

        // 2. Create via factory method (triggers domain validation)
        const typeData = WorkItemType.create(
            dto.workspaceId,
            dto.name,
            dto.description,
            dto.entityType
        );

        // 3. Persist
        const type = await this.workItemTypeRepo.create(typeData);

        // 4. Audit log (fire-and-forget)
        if (dto.userId) {
            await this.auditLogService?.log({
                workspaceId: dto.workspaceId,
                userId: dto.userId,
                action: AuditAction.WORK_ITEM_TYPE_CREATED,
                targetType: 'WorkItemType',
                targetId: type.id,
            });
        }

        return type;
    }
}
