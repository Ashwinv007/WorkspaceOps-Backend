import { IDocumentTypeRepository } from '../../domain/repositories/IDocumentTypeRepository';
import { DocumentType } from '../../domain/entities/DocumentType';
import { DocumentTypeField } from '../../domain/entities/DocumentTypeField';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/AppError';
import { isValidObjectId } from '../../../../shared/utils/ValidationUtils';

/**
 * Get Document Type By ID Use Case (Application Layer)
 * 
 * Retrieves a specific document type with its fields.
 * Verifies it belongs to the specified workspace.
 */

export interface GetDocumentTypeByIdInput {
    id: string;
    workspaceId: string;
}

export class GetDocumentTypeById {
    constructor(
        private readonly documentTypeRepo: IDocumentTypeRepository
    ) { }

    async execute(input: GetDocumentTypeByIdInput): Promise<{ documentType: DocumentType; fields: DocumentTypeField[] }> {
        // 1. Validate ID format
        if (!isValidObjectId(input.id)) {
            throw new ValidationError('Invalid document type ID format');
        }

        if (!isValidObjectId(input.workspaceId)) {
            throw new ValidationError('Invalid workspace ID format');
        }

        // 2. Fetch document type with fields
        const result = await this.documentTypeRepo.findByIdWithFields(input.id);

        if (!result) {
            throw new NotFoundError('Document type not found');
        }

        // 3. Verify belongs to specified workspace
        if (result.documentType.workspaceId !== input.workspaceId) {
            throw new NotFoundError('Document type not found in this workspace');
        }

        return result;
    }
}
