import { ValidationError } from '../../../../shared/domain/errors/AppError';
import { DocumentStatus } from '../enums/DocumentStatus';

/**
 * Document Domain Entity
 * 
 * Represents a document uploaded to a workspace with optional entity linking,
 * metadata, and expiry tracking.
 * 
 * MongoDB Schema:
 * {
 *   _id: ObjectId,
 *   workspaceId: ObjectId,
 *   documentTypeId: ObjectId,
 *   entityId: ObjectId | null,
 *   fileName: string,
 *   fileUrl: string,
 *   fileSize: number,
 *   mimeType: string,
 *   metadata: object,
 *   expiryDate: Date,
 *   uploadedBy: ObjectId,
 *   createdAt: Date
 * }
 */
export class Document {
    constructor(
        public readonly id: string,
        public readonly workspaceId: string,
        public readonly documentTypeId: string,
        public readonly fileName: string,
        public readonly fileUrl: string,
        public readonly fileSize: number,
        public readonly uploadedBy: string,
        public readonly createdAt: Date,
        public readonly entityId?: string,
        public readonly mimeType?: string,
        public readonly metadata?: Record<string, any>,
        public readonly expiryDate?: Date
    ) {
        this.validate();
    }

    private validate(): void {
        // Validate workspaceId
        if (!this.workspaceId || !this.workspaceId.trim()) {
            throw new ValidationError('Workspace ID is required');
        }

        // Validate documentTypeId
        if (!this.documentTypeId || !this.documentTypeId.trim()) {
            throw new ValidationError('Document Type ID is required');
        }

        // Validate fileName
        if (!this.fileName || !this.fileName.trim()) {
            throw new ValidationError('File name is required');
        }

        if (this.fileName.trim().length > 255) {
            throw new ValidationError('File name must not exceed 255 characters');
        }

        // Validate fileUrl
        if (!this.fileUrl || !this.fileUrl.trim()) {
            throw new ValidationError('File URL is required');
        }

        // Validate fileSize
        if (!this.fileSize || this.fileSize <= 0) {
            throw new ValidationError('File size must be greater than 0');
        }

        // Validate uploadedBy
        if (!this.uploadedBy || !this.uploadedBy.trim()) {
            throw new ValidationError('Uploaded by user ID is required');
        }
    }

    /**
     * Calculate the expiry status of this document
     * @param thresholdDays Number of days before expiry to consider document as "expiring" (default 30)
     * @returns DocumentStatus (VALID, EXPIRING, or EXPIRED)
     */
    calculateExpiryStatus(thresholdDays: number = 30): DocumentStatus {
        // If no expiry date, document is always valid
        if (!this.expiryDate) {
            return DocumentStatus.VALID;
        }

        const now = new Date();
        const expiry = new Date(this.expiryDate);

        // If expired (past date)
        if (expiry < now) {
            return DocumentStatus.EXPIRED;
        }

        // Calculate days until expiry
        const daysUntilExpiry = Math.ceil(
            (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // If expiring within threshold
        if (daysUntilExpiry <= thresholdDays) {
            return DocumentStatus.EXPIRING;
        }

        // Otherwise valid
        return DocumentStatus.VALID;
    }

    /**
     * Factory method for creating new documents (without id and createdAt)
     */
    static create(
        workspaceId: string,
        documentTypeId: string,
        fileName: string,
        fileUrl: string,
        fileSize: number,
        uploadedBy: string,
        entityId?: string,
        mimeType?: string,
        metadata?: Record<string, any>,
        expiryDate?: Date
    ): Omit<Document, 'id' | 'createdAt'> {
        const tempDoc = new Document(
            'temp',
            workspaceId,
            documentTypeId,
            fileName.trim(),
            fileUrl,
            fileSize,
            uploadedBy,
            new Date(),
            entityId,
            mimeType,
            metadata,
            expiryDate
        );

        return {
            workspaceId: tempDoc.workspaceId,
            documentTypeId: tempDoc.documentTypeId,
            fileName: tempDoc.fileName,
            fileUrl: tempDoc.fileUrl,
            fileSize: tempDoc.fileSize,
            uploadedBy: tempDoc.uploadedBy,
            entityId: tempDoc.entityId,
            mimeType: tempDoc.mimeType,
            metadata: tempDoc.metadata,
            expiryDate: tempDoc.expiryDate,
            calculateExpiryStatus: tempDoc.calculateExpiryStatus.bind(tempDoc),
            validate: tempDoc.validate.bind(tempDoc)
        } as any;
    }
}
