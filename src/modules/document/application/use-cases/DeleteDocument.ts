import { IDocumentRepository } from '../../domain/repositories/IDocumentRepository';
import { NotFoundError } from '../../../../shared/domain/errors/AppError';
import { IAuditLogService } from '../../../audit-log/application/services/IAuditLogService';
import { AuditAction } from '../../../audit-log/domain/enums/AuditAction';

/**
 * DeleteDocument Use Case
 * 
 * Deletes document metadata from database
 * Note: Physical file deletion is handled by the infrastructure layer (FileStorageService)
 */
export class DeleteDocument {
    constructor(
        private documentRepository: IDocumentRepository,
        private auditLogService?: IAuditLogService
    ) { }

    async execute(id: string, workspaceId: string, userId?: string): Promise<void> {
        // Delete from repository
        const deleted = await this.documentRepository.delete(id, workspaceId);

        if (!deleted) {
            throw new NotFoundError('Document not found');
        }

        // Audit log (fire-and-forget)
        if (userId) {
            await this.auditLogService?.log({
                workspaceId,
                userId,
                action: AuditAction.DOCUMENT_DELETED,
                targetType: 'Document',
                targetId: id,
            });
        }
    }
}
