import { IDocumentTypeRepository } from '../../domain/repositories/IDocumentTypeRepository';
import { DocumentType } from '../../domain/entities/DocumentType';
import { DocumentTypeField } from '../../domain/entities/DocumentTypeField';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/AppError';
import { isValidObjectId } from '../../../../shared/utils/ValidationUtils';
import { IAuditLogService } from '../../../audit-log/application/services/IAuditLogService';
import { AuditAction } from '../../../audit-log/domain/enums/AuditAction';

/**
 * Update Document Type Use Case (Application Layer)
 * 
 * Updates document type properties.
 * Validates business rules when enabling expiry tracking.
 */

export interface UpdateDocumentTypeInput {
    id: string;
    workspaceId: string;
    userId: string;
    name?: string;
    hasMetadata?: boolean;
    hasExpiry?: boolean;
}

export class UpdateDocumentType {
    constructor(
        private readonly documentTypeRepo: IDocumentTypeRepository,
        private readonly auditLogService?: IAuditLogService
    ) { }

    async execute(input: UpdateDocumentTypeInput): Promise<{ documentType: DocumentType; fields: DocumentTypeField[] }> {
        // 1. Validate ID format
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

        // 3. Validate name if provided
        if (input.name !== undefined) {
            if (!input.name || input.name.trim().length === 0) {
                throw new ValidationError('Document type name cannot be empty');
            }

            if (input.name.trim().length > 255) {
                throw new ValidationError('Document type name must not exceed 255 characters');
            }
        }

        // 4. Validate expiry field requirement if enabling hasExpiry
        if (input.hasExpiry === true && !existing.documentType.hasExpiry) {
            const hasExpiryField = existing.fields.some(f => f.isExpiryField);
            if (!hasExpiryField) {
                throw new ValidationError(
                    'Cannot enable expiry tracking without at least one expiry field. Add an expiry field first.'
                );
            }
        }

        // 5. Build updates object
        const updates: any = {};
        if (input.name !== undefined) updates.name = input.name.trim();
        if (input.hasMetadata !== undefined) updates.hasMetadata = input.hasMetadata;
        if (input.hasExpiry !== undefined) updates.hasExpiry = input.hasExpiry;

        // 6. Update document type
        const updatedDocType = await this.documentTypeRepo.update(input.id, updates);

        // 7. Fetch with fields
        const result = await this.documentTypeRepo.findByIdWithFields(input.id);
        if (!result) {
            throw new NotFoundError('Document type not found after update');
        }

        // 8. Audit log (fire-and-forget)
        await this.auditLogService?.log({
            workspaceId: input.workspaceId,
            userId: input.userId,
            action: AuditAction.DOCUMENT_TYPE_UPDATED,
            targetType: 'DocumentType',
            targetId: input.id,
        });

        return result;
    }
}
