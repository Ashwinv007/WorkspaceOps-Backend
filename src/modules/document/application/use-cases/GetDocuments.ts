import { IDocumentRepository } from '../../domain/repositories/IDocumentRepository';
import { Document } from '../../domain/entities/Document';
import { DocumentFilters } from '../dto/DocumentDTO';

/**
 * GetDocuments Use Case
 * 
 * Retrieves all documents in a workspace with optional filtering by:
 * - Document type
 * - Entity
 */
export class GetDocuments {
    constructor(private documentRepository: IDocumentRepository) { }

    async execute(workspaceId: string, filters?: DocumentFilters): Promise<Document[]> {
        const documents = await this.documentRepository.findByWorkspace(
            workspaceId,
            filters
        );

        return documents;
    }
}
