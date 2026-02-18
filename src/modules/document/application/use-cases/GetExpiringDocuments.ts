import { IDocumentRepository } from '../../domain/repositories/IDocumentRepository';
import { Document } from '../../domain/entities/Document';

/**
 * GetExpiringDocuments Use Case
 * 
 * Retrieves documents that are expiring within the specified threshold
 */
export class GetExpiringDocuments {
    constructor(private documentRepository: IDocumentRepository) { }

    async execute(workspaceId: string, daysThreshold: number = 30): Promise<Document[]> {
        const documents = await this.documentRepository.findExpiringDocuments(
            workspaceId,
            daysThreshold
        );

        return documents;
    }
}
