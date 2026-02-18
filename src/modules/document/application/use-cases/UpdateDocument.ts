import { IDocumentRepository } from '../../domain/repositories/IDocumentRepository';
import { Document } from '../../domain/entities/Document';
import { UpdateDocumentDTO } from '../dto/DocumentDTO';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/AppError';

/**
 * UpdateDocument Use Case
 * 
 * Updates document metadata, entity link, or expiry date
 * Note: Does NOT update the physical file itself
 */
export class UpdateDocument {
    constructor(private documentRepository: IDocumentRepository) { }

    async execute(
        id: string,
        workspaceId: string,
        dto: UpdateDocumentDTO
    ): Promise<Document> {
        // Validate at least one field is being updated
        if (!dto.entityId && !dto.metadata && !dto.expiryDate) {
            throw new ValidationError('At least one field must be provided for update');
        }

        // Update document
        const updatedDocument = await this.documentRepository.update(
            id,
            workspaceId,
            dto
        );

        if (!updatedDocument) {
            throw new NotFoundError('Document not found');
        }

        return updatedDocument;
    }
}
