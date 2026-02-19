import { IDocumentTypeRepository } from '../../domain/repositories/IDocumentTypeRepository';
import { IWorkspaceRepository } from '../../../workspace/domain/repositories/IWorkspaceRepository';
import { DocumentType } from '../../domain/entities/DocumentType';
import { DocumentTypeField } from '../../domain/entities/DocumentTypeField';
import { FieldType } from '../../domain/enums/FieldType';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/AppError';
import { isValidObjectId } from '../../../../shared/utils/ValidationUtils';
import { IAuditLogService } from '../../../audit-log/application/services/IAuditLogService';
import { AuditAction } from '../../../audit-log/domain/enums/AuditAction';

/**
 * Create Document Type Use Case (Application Layer)
 * 
 * Creates a new document type with its metadata fields.
 * Validates workspace exists and enforces business rules.
 */

export interface CreateDocumentTypeInput {
    workspaceId: string;
    userId: string;
    name: string;
    hasMetadata: boolean;
    hasExpiry: boolean;
    fields: {
        fieldKey: string;
        fieldType: FieldType;
        isRequired: boolean;
        isExpiryField: boolean;
    }[];
}

export class CreateDocumentType {
    constructor(
        private readonly documentTypeRepo: IDocumentTypeRepository,
        private readonly workspaceRepo: IWorkspaceRepository,
        private readonly auditLogService?: IAuditLogService
    ) { }

    async execute(input: CreateDocumentTypeInput): Promise<{ documentType: DocumentType; fields: DocumentTypeField[] }> {
        // 1. Validate workspace ID format
        if (!isValidObjectId(input.workspaceId)) {
            throw new ValidationError('Invalid workspace ID format');
        }

        // 2. Validate workspace exists
        const workspace = await this.workspaceRepo.findById(input.workspaceId);
        if (!workspace) {
            throw new NotFoundError('Workspace not found');
        }

        // 3. Validate document type name
        if (!input.name || input.name.trim().length === 0) {
            throw new ValidationError('Document type name is required');
        }

        if (input.name.trim().length > 255) {
            throw new ValidationError('Document type name must not exceed 255 characters');
        }

        // 4. Validate fields if hasMetadata is true
        if (input.hasMetadata && (!input.fields || input.fields.length === 0)) {
            throw new ValidationError('Document type with metadata must have at least one field');
        }

        // 5. Validate expiry field requirement
        if (input.hasExpiry) {
            const hasExpiryField = input.fields.some(f => f.isExpiryField);
            if (!hasExpiryField) {
                throw new ValidationError('Document type with expiry tracking must have at least one expiry field');
            }

            // Validate all expiry fields are date type
            const invalidExpiryFields = input.fields.filter(
                f => f.isExpiryField && f.fieldType !== FieldType.DATE
            );
            if (invalidExpiryFields.length > 0) {
                throw new ValidationError('Expiry fields must be of type date');
            }
        }

        // 6. Validate no duplicate field keys
        const fieldKeys = input.fields.map(f => f.fieldKey.toLowerCase());
        const uniqueKeys = new Set(fieldKeys);
        if (fieldKeys.length !== uniqueKeys.size) {
            throw new ValidationError('Duplicate field keys are not allowed');
        }

        // 7. Create document type entity
        const documentType = DocumentType.create(
            input.workspaceId,
            input.name.trim(),
            input.hasMetadata,
            input.hasExpiry
        );

        // 8. Prepare field data (don't create entities yet - documentTypeId not known)
        const fieldData = input.fields.map(f => ({
            fieldKey: f.fieldKey.trim(),
            fieldType: f.fieldType,
            isRequired: f.isRequired,
            isExpiryField: f.isExpiryField
        }));

        // 9. Persist to database (atomic transaction)
        const createdDocType = await this.documentTypeRepo.create(documentType, fieldData);

        // 10. Fetch with fields
        const result = await this.documentTypeRepo.findByIdWithFields(createdDocType.id);
        if (!result) {
            throw new Error('Failed to retrieve created document type');
        }

        // 11. Audit log (fire-and-forget)
        await this.auditLogService?.log({
            workspaceId: input.workspaceId,
            userId: input.userId,
            action: AuditAction.DOCUMENT_TYPE_CREATED,
            targetType: 'DocumentType',
            targetId: createdDocType.id,
        });

        return result;
    }
}
