/**
 * Data Transfer Objects for Document Module
 */

export interface UploadDocumentDTO {
    workspaceId: string;
    documentTypeId: string;
    entityId?: string;
    file: Express.Multer.File;
    metadata?: Record<string, any>;
    expiryDate?: Date;
    uploadedBy: string;
}

export interface UpdateDocumentDTO {
    entityId?: string;
    metadata?: Record<string, any>;
    expiryDate?: Date;
}

export interface DocumentFilters {
    documentTypeId?: string;
    entityId?: string;
    expiryStatus?: string; // VALID | EXPIRING | EXPIRED — filtered in-memory after fetch
}
