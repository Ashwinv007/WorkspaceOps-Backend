import { Document } from '../../domain/entities/Document';

/**
 * Document Presenter (Interfaces Layer)
 * 
 * Formats document data for HTTP responses.
 */
export class DocumentPresenter {
    /**
     * Present a single document
     */
    presentDocument(document: Document, baseUrl?: string) {
        const response: any = {
            id: document.id,
            workspaceId: document.workspaceId,
            documentTypeId: document.documentTypeId,
            fileName: document.fileName,
            fileUrl: document.fileUrl,
            fileSize: document.fileSize,
            mimeType: document.mimeType,
            uploadedBy: document.uploadedBy,
            createdAt: document.createdAt,
            expiryStatus: document.calculateExpiryStatus()
        };

        // Add optional fields if present
        if (document.entityId) {
            response.entityId = document.entityId;
        }

        if (document.metadata) {
            response.metadata = document.metadata;
        }

        if (document.expiryDate) {
            response.expiryDate = document.expiryDate;
        }

        // Add download URL
        if (baseUrl) {
            response.downloadUrl = `${baseUrl}/workspaces/${document.workspaceId}/documents/${document.id}/download`;
        }

        return response;
    }

    /**
     * Present multiple documents
     */
    presentDocuments(documents: Document[], baseUrl?: string) {
        return {
            documents: documents.map(doc => this.presentDocument(doc, baseUrl)),
            count: documents.length
        };
    }
}
