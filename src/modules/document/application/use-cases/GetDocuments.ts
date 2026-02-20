import { IDocumentRepository } from '../../domain/repositories/IDocumentRepository';
import { Document } from '../../domain/entities/Document';
import { DocumentFilters } from '../dto/DocumentDTO';

/**
 * GetDocuments Use Case
 *
 * Retrieves all documents in a workspace with optional filtering by:
 * - Document type
 * - Entity
 * - Expiry status (VALID | EXPIRING | EXPIRED) — filtered in-memory after DB fetch
 */
export class GetDocuments {
    constructor(private documentRepository: IDocumentRepository) { }

    async execute(workspaceId: string, filters?: DocumentFilters): Promise<Document[]> {
        // DB-level filters (documentTypeId, entityId)
        const dbFilters = {
            documentTypeId: filters?.documentTypeId,
            entityId: filters?.entityId
        };

        const documents = await this.documentRepository.findByWorkspace(workspaceId, dbFilters);

        // In-memory filter by expiryStatus (computed field — not stored in DB)
        if (filters?.expiryStatus) {
            const targetStatus = filters.expiryStatus.toUpperCase();
            return documents.filter(doc => doc.calculateExpiryStatus() === targetStatus);
        }

        return documents;
    }
}
