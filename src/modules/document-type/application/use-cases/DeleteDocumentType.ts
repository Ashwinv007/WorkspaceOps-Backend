import { IDocumentTypeRepository } from '../../domain/repositories/IDocumentTypeRepository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/AppError';
import { isValidObjectId } from '../../../../shared/utils/ValidationUtils';
import { IAuditLogService } from '../../../audit-log/application/services/IAuditLogService';
import { AuditAction } from '../../../audit-log/domain/enums/AuditAction';

/**
 * Delete Document Type Use Case (Application Layer)
 * 
 * Deletes a document type and all its fields.
 * Verifies workspace ownership before deletion.
 */

export interface DeleteDocumentTypeInput {
    id: string;
    workspaceId: string;
    userId: string;
}

export class DeleteDocumentType {
    constructor(
        private readonly documentTypeRepo: IDocumentTypeRepository,
        private readonly auditLogService?: IAuditLogService
    ) { }

    async execute(input: DeleteDocumentTypeInput): Promise<void> {
        // 1. Validate ID formats
        if (!isValidObjectId(input.id)) {
            throw new ValidationError('Invalid document type ID format');
        }

        if (!isValidObjectId(input.workspaceId)) {
            throw new ValidationError('Invalid workspace ID format');
        }

        // 2. Verify document type exists and belongs to workspace
        const existing = await this.documentTypeRepo.findByIdWithFields(input.id);
        if (!existing) {
            throw new NotFoundError('Document type not found');
        }

        if (existing.documentType.workspaceId !== input.workspaceId) {
            throw new NotFoundError('Document type not found in this workspace');
        }

        // 3. Delete document type (cascades to fields)
        await this.documentTypeRepo.delete(input.id);

        // 4. Audit log (fire-and-forget)
        await this.auditLogService?.log({
            workspaceId: input.workspaceId,
            userId: input.userId,
            action: AuditAction.DOCUMENT_TYPE_DELETED,
            targetType: 'DocumentType',
            targetId: input.id,
        });
    }
}
