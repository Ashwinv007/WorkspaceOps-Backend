import { IWorkItemRepository } from '../../domain/repositories/IWorkItemRepository';
import { IWorkItemDocumentRepository } from '../../domain/repositories/IWorkItemDocumentRepository';
import { NotFoundError } from '../../../../shared/domain/errors/AppError';
import { IAuditLogService } from '../../../audit-log/application/services/IAuditLogService';
import { AuditAction } from '../../../audit-log/domain/enums/AuditAction';

/**
 * UnlinkDocument Use Case
 * 
 * Removes a document link from a work item.
 */
export class UnlinkDocument {
    constructor(
        private workItemRepo: IWorkItemRepository,
        private workItemDocumentRepo: IWorkItemDocumentRepository,
        private auditLogService?: IAuditLogService
    ) { }

    async execute(workItemId: string, workspaceId: string, documentId: string, userId?: string): Promise<void> {
        // 1. Validate work item exists
        const item = await this.workItemRepo.findById(workItemId, workspaceId);
        if (!item) {
            throw new NotFoundError('Work item not found');
        }

        // 2. Remove the link
        const removed = await this.workItemDocumentRepo.unlink(workItemId, documentId);
        if (!removed) {
            throw new NotFoundError('Document link not found');
        }

        // 3. Audit log (fire-and-forget)
        if (userId) {
            await this.auditLogService?.log({
                workspaceId,
                userId,
                action: AuditAction.WORK_ITEM_DOCUMENT_UNLINKED,
                targetType: 'WorkItem',
                targetId: workItemId,
            });
        }
    }
}
