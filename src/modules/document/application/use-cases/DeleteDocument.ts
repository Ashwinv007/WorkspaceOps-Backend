import { IDocumentRepository } from '../../domain/repositories/IDocumentRepository';
import { NotFoundError } from '../../../../shared/domain/errors/AppError';

/**
 * DeleteDocument Use Case
 * 
 * Deletes document metadata from database
 * Note: Physical file deletion is handled by the infrastructure layer (FileStorageService)
 */
export class DeleteDocument {
    constructor(private documentRepository: IDocumentRepository) { }

    async execute(id: string, workspaceId: string): Promise<void> {
        // Delete from repository
        const deleted = await this.documentRepository.delete(id, workspaceId);

        if (!deleted) {
            throw new NotFoundError('Document not found');
        }
    }
}
