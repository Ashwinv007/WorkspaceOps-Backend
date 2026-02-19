import { IDocumentRepository } from '../../domain/repositories/IDocumentRepository';
import { Document } from '../../domain/entities/Document';
import { UploadDocumentDTO } from '../dto/DocumentDTO';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/AppError';
import { IAuditLogService } from '../../../audit-log/application/services/IAuditLogService';
import { AuditAction } from '../../../audit-log/domain/enums/AuditAction';

/**
 * UploadDocument Use Case
 * 
 * Business logic for uploading a document with validation:
 * - Validates document type belongs to workspace
 * - Validates entity (if provided) belongs to workspace 
 * - Validates required metadata fields (if document type has metadata enabled)
 * - Stores file and creates document record
 */
export class UploadDocument {
    constructor(
        private documentRepository: IDocumentRepository,
        private documentTypeRepository: any, // IDocumentTypeRepository
        private entityRepository?: any, // IEntityRepository
        private auditLogService?: IAuditLogService
    ) { }

    async execute(dto: UploadDocumentDTO, fileUrl: string): Promise<Document> {
        // 1. Validate document type exists and belongs to workspace
        const documentType = await this.documentTypeRepository.findById(
            dto.documentTypeId,
            dto.workspaceId
        );

        if (!documentType) {
            throw new NotFoundError('Document type not found in this workspace');
        }

        // 2. Validate entity if provided
        if (dto.entityId && this.entityRepository) {
            const entity = await this.entityRepository.findById(
                dto.entityId,
                dto.workspaceId
            );

            if (!entity) {
                throw new NotFoundError('Entity not found in this workspace');
            }
        }

        // 3. Validate metadata if document type requires it
        if (documentType.hasMetadata && (!dto.metadata || Object.keys(dto.metadata).length === 0)) {
            throw new ValidationError(
                'This document type requires metadata fields'
            );
        }

        // 4. Create document entity using factory method
        const documentData = Document.create(
            dto.workspaceId,
            dto.documentTypeId,
            dto.file.originalname,
            fileUrl,
            dto.file.size,
            dto.uploadedBy,
            dto.entityId,
            dto.file.mimetype,
            dto.metadata,
            dto.expiryDate
        );

        // 5. Persist to database
        const createdDocument = await this.documentRepository.create(documentData);

        // 6. Audit log (fire-and-forget)
        await this.auditLogService?.log({
            workspaceId: dto.workspaceId,
            userId: dto.uploadedBy,
            action: AuditAction.DOCUMENT_UPLOADED,
            targetType: 'Document',
            targetId: createdDocument.id,
        });

        return createdDocument;
    }
}
