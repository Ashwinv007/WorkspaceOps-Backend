import { IDocumentRepository } from '../../domain/repositories/IDocumentRepository';
import { Document } from '../../domain/entities/Document';
import { NotFoundError } from '../../../../shared/domain/errors/AppError';

/**
 * GetDocumentById Use Case
 * 
 * Retrieves a single document by ID with workspace validation
 */
export class GetDocumentById {
    constructor(private documentRepository: IDocumentRepository) { }

    async execute(id: string, workspaceId: string): Promise<Document> {
        const document = await this.documentRepository.findById(id, workspaceId);

        if (!document) {
            throw new NotFoundError('Document not found');
        }

        return document;
    }
}
