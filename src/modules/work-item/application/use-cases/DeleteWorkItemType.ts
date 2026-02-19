import { IWorkItemTypeRepository } from '../../domain/repositories/IWorkItemTypeRepository';
import { IWorkItemRepository } from '../../domain/repositories/IWorkItemRepository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/AppError';
import { IAuditLogService } from '../../../audit-log/application/services/IAuditLogService';
import { AuditAction } from '../../../audit-log/domain/enums/AuditAction';

/**
 * DeleteWorkItemType Use Case
 * 
 * Deletes a work item type from a workspace.
 * Prevents deletion if any work items reference this type.
 */
export class DeleteWorkItemType {
    constructor(
        private workItemTypeRepo: IWorkItemTypeRepository,
        private workItemRepo: IWorkItemRepository,
        private auditLogService?: IAuditLogService
    ) { }

    async execute(id: string, workspaceId: string, userId?: string): Promise<void> {
        // 1. Check type exists
        const type = await this.workItemTypeRepo.findById(id, workspaceId);
        if (!type) {
            throw new NotFoundError('Work item type not found');
        }

        // 2. Check no work items reference this type
        const items = await this.workItemRepo.findByWorkspace(workspaceId, { workItemTypeId: id });
        if (items.length > 0) {
            throw new ValidationError(
                `Cannot delete: ${items.length} work item(s) reference this type`
            );
        }

        // 3. Delete
        await this.workItemTypeRepo.delete(id, workspaceId);

        // 4. Audit log (fire-and-forget)
        if (userId) {
            await this.auditLogService?.log({
                workspaceId,
                userId,
                action: AuditAction.WORK_ITEM_TYPE_DELETED,
                targetType: 'WorkItemType',
                targetId: id,
            });
        }
    }
}
