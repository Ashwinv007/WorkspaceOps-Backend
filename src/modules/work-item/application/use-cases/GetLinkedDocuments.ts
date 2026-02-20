import { IWorkItemDocumentRepository } from '../../domain/repositories/IWorkItemDocumentRepository';
import { IDocumentRepository } from '../../../document/domain/repositories/IDocumentRepository';
import { Document } from '../../../document/domain/entities/Document';

export interface LinkedDocument extends Document {
    linkedAt: Date;
}

/**
 * GetLinkedDocuments Use Case
 *
 * Fetches full document objects for all documents linked to a work item.
 * Returns document data (filename, expiryStatus, downloadUrl candidate, etc.)
 * plus the linkedAt timestamp.
 */
export class GetLinkedDocuments {
    constructor(
        private readonly workItemDocumentRepo: IWorkItemDocumentRepository,
        private readonly documentRepo: IDocumentRepository
    ) {}

    async execute(workItemId: string, workspaceId: string): Promise<LinkedDocument[]> {
        const links = await this.workItemDocumentRepo.findByWorkItem(workItemId);

        const docs = await Promise.all(
            links.map(async link => {
                const doc = await this.documentRepo.findById(link.documentId, workspaceId);
                if (!doc) return null;
                // Attach linkedAt from the junction record
                return Object.assign(Object.create(Object.getPrototypeOf(doc)), doc, {
                    linkedAt: link.linkedAt
                }) as LinkedDocument;
            })
        );

        return docs.filter((d): d is LinkedDocument => d !== null);
    }
}
