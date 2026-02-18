import { IDocumentRepository } from '../../domain/repositories/IDocumentRepository';
import { Document } from '../../domain/entities/Document';

/**
 * GetDocumentsByEntity Use Case
 * 
 * Retrieves all documents linked to a specific entity
 */
export class GetDocumentsByEntity {
    constructor(private documentRepository: IDocumentRepository) { }

    async execute(entityId: string, workspaceId: string): Promise<Document[]> {
        const documents = await this.documentRepository.findByEntity(
            entityId,
            workspaceId
        );

        return documents;
    }
}
