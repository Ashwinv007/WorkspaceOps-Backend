import { IDocumentTypeRepository } from '../../domain/repositories/IDocumentTypeRepository';
import { DocumentType } from '../../domain/entities/DocumentType';
import { DocumentTypeField } from '../../domain/entities/DocumentTypeField';
import { ValidationError } from '../../../../shared/domain/errors/AppError';
import { isValidObjectId } from '../../../../shared/utils/ValidationUtils';

/**
 * Get Document Types Use Case (Application Layer)
 * 
 * Retrieves all document types for a workspace with their fields.
 */

export interface GetDocumentTypesInput {
    workspaceId: string;
}

export class GetDocumentTypes {
    constructor(
        private readonly documentTypeRepo: IDocumentTypeRepository
    ) { }

    async execute(input: GetDocumentTypesInput): Promise<{ documentType: DocumentType; fields: DocumentTypeField[] }[]> {
        // 1. Validate workspace ID format
        if (!isValidObjectId(input.workspaceId)) {
            throw new ValidationError('Invalid workspace ID format');
        }

        // 2. Fetch all document types for workspace (without fields)
        const documentTypes = await this.documentTypeRepo.findByWorkspaceId(input.workspaceId);

        // 3. Fetch fields for each document type
        const results = await Promise.all(
            documentTypes.map(async (docType) => {
                const fields = await this.documentTypeRepo.getFields(docType.id);
                return {
                    documentType: docType,
                    fields
                };
            })
        );

        return results;
    }
}
