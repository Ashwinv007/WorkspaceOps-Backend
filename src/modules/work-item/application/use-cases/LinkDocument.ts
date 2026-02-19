import { IWorkItemRepository } from '../../domain/repositories/IWorkItemRepository';
import { IWorkItemDocumentRepository } from '../../domain/repositories/IWorkItemDocumentRepository';
import { WorkItemDocument } from '../../domain/entities/WorkItemDocument';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/AppError';
import { IAuditLogService } from '../../../audit-log/application/services/IAuditLogService';
import { AuditAction } from '../../../audit-log/domain/enums/AuditAction';

/**
 * LinkDocument Use Case
 * 
 * Links a document to a work item.
 * Validates both exist in the same workspace and prevents duplicate links.
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

        // 3. Check if already linked (mirrors SQL UNIQUE constraint)
        const alreadyLinked = await this.workItemDocumentRepo.exists(workItemId, documentId);
        if (alreadyLinked) {
            throw new ValidationError('Document is already linked to this work item');
        }

        // 4. Create the link
        const link = await this.workItemDocumentRepo.link(workItemId, documentId);

        // 5. Audit log (fire-and-forget)
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
