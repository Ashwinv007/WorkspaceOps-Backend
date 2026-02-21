import { IWorkItemRepository } from '../../domain/repositories/IWorkItemRepository';
import { IWorkItemDocumentRepository } from '../../domain/repositories/IWorkItemDocumentRepository';
import { WorkItemDocument } from '../../domain/entities/WorkItemDocument';
import { NotFoundError } from '../../../../shared/domain/errors/AppError';
import { IAuditLogService } from '../../../audit-log/application/services/IAuditLogService';
import { AuditAction } from '../../../audit-log/domain/enums/AuditAction';

/**
 * LinkDocument Use Case
 *
 * Links a document to a work item.
 * Validates both exist in the same workspace and prevents duplicate links.
 *
 * Duplicate link prevention is enforced by the DB unique index on (workItemId, documentId).
 * The repository catches error code 11000 and re-throws as ValidationError — so we
 * do NOT do a pre-check exists() here (removing the TOCTOU race condition).
 */
export class LinkDocument {
    constructor(
        private workItemRepo: IWorkItemRepository,
        private workItemDocumentRepo: IWorkItemDocumentRepository,
        private documentRepo: any, // IDocumentRepository
        private auditLogService?: IAuditLogService
    ) { }

    async execute(workItemId: string, workspaceId: string, documentId: string, userId?: string): Promise<WorkItemDocument> {
        // 1. Validate work item exists in workspace
        const item = await this.workItemRepo.findById(workItemId, workspaceId);
        if (!item) {
            throw new NotFoundError('Work item not found');
        }

        // 2. Validate document exists in same workspace
        const document = await this.documentRepo.findById(documentId, workspaceId);
        if (!document) {
            throw new NotFoundError('Document not found in this workspace');
        }

        // 3. Create the link — the repository catches duplicate key (11000) on the
        //    unique index { workItemId, documentId } and throws ValidationError.
        const link = await this.workItemDocumentRepo.link(workItemId, documentId);

        // 4. Audit log (fire-and-forget)
        if (userId) {
            await this.auditLogService?.log({
                workspaceId,
                userId,
                action: AuditAction.WORK_ITEM_DOCUMENT_LINKED,
                targetType: 'WorkItem',
                targetId: workItemId,
            });
        }

        return link;
    }
}
