import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { UploadDocument } from '../../application/use-cases/UploadDocument';
import { GetDocuments } from '../../application/use-cases/GetDocuments';
import { GetDocumentById } from '../../application/use-cases/GetDocumentById';
import { GetDocumentsByEntity } from '../../application/use-cases/GetDocumentsByEntity';
import { GetExpiringDocuments } from '../../application/use-cases/GetExpiringDocuments';
import { UpdateDocument } from '../../application/use-cases/UpdateDocument';
import { DeleteDocument } from '../../application/use-cases/DeleteDocument';
import { DocumentPresenter } from '../presenters/DocumentPresenter';
import type { IFileStorageService } from '../../infrastructure/storage/FileStorageService';
import { handleMulterError } from '../../infrastructure/middleware/upload.middleware';

/**
 * Document Controller (Interfaces Layer)
 * 
 * Handles HTTP requests for document operations.
 * Delegates business logic to use cases and formats responses via presenter.
 */
export class DocumentController {
    constructor(
        private readonly uploadDocumentUseCase: UploadDocument,
        private readonly getDocumentsUseCase: GetDocuments,
        private readonly getDocumentByIdUseCase: GetDocumentById,
        private readonly getDocumentsByEntityUseCase: GetDocumentsByEntity,
        private readonly getExpiringDocumentsUseCase: GetExpiringDocuments,
        private readonly updateDocumentUseCase: UpdateDocument,
        private readonly deleteDocumentUseCase: DeleteDocument,
        private readonly fileStorageService: IFileStorageService,
        private readonly presenter: DocumentPresenter
    ) {
        // Bind methods to preserve 'this' context
        this.uploadDocument = this.uploadDocument.bind(this);
        this.getDocuments = this.getDocuments.bind(this);
        this.getDocumentById = this.getDocumentById.bind(this);
        this.getDocumentsByEntity = this.getDocumentsByEntity.bind(this);
        this.getExpiringDocuments = this.getExpiringDocuments.bind(this);
        this.updateDocument = this.updateDocument.bind(this);
        this.deleteDocument = this.deleteDocument.bind(this);
        this.downloadDocument = this.downloadDocument.bind(this);
    }

    /**
     * POST /workspaces/:workspaceId/documents
     * Upload a document with metadata
     */
    async uploadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaceId = req.params.workspaceId as string;
            const userId = (req as any).user?.userId; // From auth middleware
            const file = req.file;

            if (!file) {
                res.status(400).json({ error: 'No file uploaded' });
                return;
            }

            // Parse metadata if provided
            let metadata;
            if (req.body.metadata) {
                try {
                    metadata = typeof req.body.metadata === 'string'
                        ? JSON.parse(req.body.metadata)
                        : req.body.metadata;
                } catch (error) {
                    res.status(400).json({ error: 'Invalid metadata format' });
                    return;
                }
            }

            // Parse expiry date if provided
            let expiryDate;
            if (req.body.expiryDate) {
                expiryDate = new Date(req.body.expiryDate);
                if (isNaN(expiryDate.getTime())) {
                    res.status(400).json({ error: 'Invalid expiry date format' });
                    return;
                }
            }

            // Generate document ID (will be used for file storage path)
            const documentId = Date.now().toString() + Math.random().toString(36).substring(7);

            // Save file to storage
            const fileUrl = await this.fileStorageService.saveFile(
                workspaceId,
                documentId,
                file
            );

            // Execute use case
            const document = await this.uploadDocumentUseCase.execute(
                {
                    workspaceId,
                    documentTypeId: req.body.documentTypeId,
                    entityId: req.body.entityId,
                    file,
                    metadata,
                    expiryDate,
                    uploadedBy: userId
                },
                fileUrl
            );

            const baseUrl = `${req.protocol}://${req.get('host')}`;
            res.status(201).json(this.presenter.presentDocument(document, baseUrl));
        } catch (error: any) {
            if (error.name === 'MulterError') {
                handleMulterError(error);
            }
            next(error);
        }
    }

    /**
     * GET /workspaces/:workspaceId/documents
     * Get all documents with optional filters
     */
    async getDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaceId = req.params.workspaceId as string;
            const filters = {
                documentTypeId: req.query.documentTypeId as string | undefined,
                entityId: req.query.entityId as string | undefined,
                expiryStatus: req.query.expiryStatus as string | undefined
            };

            const documents = await this.getDocumentsUseCase.execute(workspaceId, filters);

            const baseUrl = `${req.protocol}://${req.get('host')}`;
            res.status(200).json(this.presenter.presentDocuments(documents, baseUrl));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /workspaces/:workspaceId/documents/:id
     * Get a specific document
     */
    async getDocumentById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaceId = req.params.workspaceId as string;
            const id = req.params.id as string;

            const document = await this.getDocumentByIdUseCase.execute(id, workspaceId);

            const baseUrl = `${req.protocol}://${req.get('host')}`;
            res.status(200).json(this.presenter.presentDocument(document, baseUrl));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /workspaces/:workspaceId/entities/:entityId/documents
     * Get all documents for a specific entity
     */
    async getDocumentsByEntity(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaceId = req.params.workspaceId as string;
            const entityId = req.params.entityId as string;

            const documents = await this.getDocumentsByEntityUseCase.execute(entityId, workspaceId);

            const baseUrl = `${req.protocol}://${req.get('host')}`;
            res.status(200).json(this.presenter.presentDocuments(documents, baseUrl));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /workspaces/:workspaceId/documents/expiring
     * Get expiring documents
     */
    async getExpiringDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaceId = req.params.workspaceId as string;
            const daysThreshold = parseInt(req.query.days as string || process.env.EXPIRY_WARNING_DAYS || '30', 10);

            const documents = await this.getExpiringDocumentsUseCase.execute(workspaceId, daysThreshold);

            const baseUrl = `${req.protocol}://${req.get('host')}`;
            res.status(200).json(this.presenter.presentDocuments(documents, baseUrl));
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /workspaces/:workspaceId/documents/:id
     * Update document metadata
     */
    async updateDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaceId = req.params.workspaceId as string;
            const id = req.params.id as string;

            // Parse expiry date if provided
            let expiryDate;
            if (req.body.expiryDate) {
                expiryDate = new Date(req.body.expiryDate);
                if (isNaN(expiryDate.getTime())) {
                    res.status(400).json({ error: 'Invalid expiry date format' });
                    return;
                }
            }

            const document = await this.updateDocumentUseCase.execute(id, workspaceId, {
                entityId: req.body.entityId,
                metadata: req.body.metadata,
                expiryDate
            }, req.user!.userId);

            const baseUrl = `${req.protocol}://${req.get('host')}`;
            res.status(200).json(this.presenter.presentDocument(document, baseUrl));
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /workspaces/:workspaceId/documents/:id
     * Delete a document
     */
    async deleteDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaceId = req.params.workspaceId as string;
            const id = req.params.id as string;

            // First get the document to retrieve fileUrl
            const document = await this.getDocumentByIdUseCase.execute(id, workspaceId);

            // Delete from database
            await this.deleteDocumentUseCase.execute(id, workspaceId, req.user!.userId);

            // Delete physical file
            await this.fileStorageService.deleteFile(document.fileUrl);

            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /workspaces/:workspaceId/documents/:id/download
     * Download a document file
     */
    async downloadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaceId = req.params.workspaceId as string;
            const id = req.params.id as string;

            // Get document metadata
            const document = await this.getDocumentByIdUseCase.execute(id, workspaceId);

            // Get local file path
            const localPath = this.fileStorageService.getLocalPath(document.fileUrl);

            // Check if file exists
            if (!fs.existsSync(localPath)) {
                res.status(404).json({ error: 'File not found on server' });
                return;
            }

            // Set headers for download
            res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
            res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');

            // Stream file to response
            const fileStream = fs.createReadStream(localPath);
            fileStream.pipe(res);
        } catch (error) {
            next(error);
        }
    }
}
