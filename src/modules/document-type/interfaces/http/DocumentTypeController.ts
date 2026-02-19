import { Request, Response, NextFunction } from 'express';
import { CreateDocumentType } from '../../application/use-cases/CreateDocumentType';
import { GetDocumentTypes } from '../../application/use-cases/GetDocumentTypes';
import { GetDocumentTypeById } from '../../application/use-cases/GetDocumentTypeById';
import { UpdateDocumentType } from '../../application/use-cases/UpdateDocumentType';
import { AddField } from '../../application/use-cases/AddField';
import { DeleteDocumentType } from '../../application/use-cases/DeleteDocumentType';
import { DocumentTypePresenter } from '../presenters/DocumentTypePresenter';
import { FieldType } from '../../domain/enums/FieldType';

/**
 * Document Type Controller (Interfaces Layer)
 * 
 * Handles HTTP requests for document type operations.
 * Delegates business logic to use cases and formats responses via presenter.
 */
export class DocumentTypeController {
    constructor(
        private readonly createDocumentTypeUseCase: CreateDocumentType,
        private readonly getDocumentTypesUseCase: GetDocumentTypes,
        private readonly getDocumentTypeByIdUseCase: GetDocumentTypeById,
        private readonly updateDocumentTypeUseCase: UpdateDocumentType,
        private readonly addFieldUseCase: AddField,
        private readonly deleteDocumentTypeUseCase: DeleteDocumentType,
        private readonly presenter: DocumentTypePresenter
    ) {
        // Bind methods to preserve 'this' context
        this.createDocumentType = this.createDocumentType.bind(this);
        this.getDocumentTypes = this.getDocumentTypes.bind(this);
        this.getDocumentTypeById = this.getDocumentTypeById.bind(this);
        this.updateDocumentType = this.updateDocumentType.bind(this);
        this.addField = this.addField.bind(this);
        this.deleteDocumentType = this.deleteDocumentType.bind(this);
    }

    /**
     * POST /workspaces/:workspaceId/document-types
     * Create a new document type with fields
     */
    async createDocumentType(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaceId = req.params.workspaceId as string;
            const { name, hasMetadata, hasExpiry, fields } = req.body;

            // Validate field types
            if (fields && Array.isArray(fields)) {
                for (const field of fields) {
                    if (!Object.values(FieldType).includes(field.fieldType)) {
                        res.status(400).json({
                            error: `Invalid field type '${field.fieldType}'. Must be one of: ${Object.values(FieldType).join(', ')}`
                        });
                        return;
                    }
                }
            }

            const result = await this.createDocumentTypeUseCase.execute({
                workspaceId,
                userId: req.user!.userId,
                name,
                hasMetadata: hasMetadata || false,
                hasExpiry: hasExpiry || false,
                fields: fields || []
            });

            res.status(201).json(this.presenter.presentDocumentType(result.documentType, result.fields));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /workspaces/:workspaceId/document-types
     * Get all document types in a workspace
     */
    async getDocumentTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaceId = req.params.workspaceId as string;

            const documentTypes = await this.getDocumentTypesUseCase.execute({
                workspaceId
            });

            res.status(200).json(this.presenter.presentDocumentTypes(documentTypes));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /workspaces/:workspaceId/document-types/:id
     * Get a specific document type with its fields
     */
    async getDocumentTypeById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaceId = req.params.workspaceId as string;
            const id = req.params.id as string;

            const result = await this.getDocumentTypeByIdUseCase.execute({
                id,
                workspaceId
            });

            res.status(200).json(this.presenter.presentDocumentType(result.documentType, result.fields));
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /workspaces/:workspaceId/document-types/:id
     * Update a document type
     */
    async updateDocumentType(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaceId = req.params.workspaceId as string;
            const id = req.params.id as string;
            const { name, hasMetadata, hasExpiry } = req.body;

            const result = await this.updateDocumentTypeUseCase.execute({
                id,
                workspaceId,
                userId: req.user!.userId,
                name,
                hasMetadata,
                hasExpiry
            });

            res.status(200).json(this.presenter.presentDocumentType(result.documentType, result.fields));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /workspaces/:workspaceId/document-types/:id/fields
     * Add a field to a document type
     */
    async addField(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaceId = req.params.workspaceId as string;
            const documentTypeId = req.params.id as string;
            const { fieldKey, fieldType, isRequired, isExpiryField } = req.body;

            // Validate field type
            if (!Object.values(FieldType).includes(fieldType)) {
                res.status(400).json({
                    error: `Invalid field type '${fieldType}'. Must be one of: ${Object.values(FieldType).join(', ')}`
                });
                return;
            }

            const field = await this.addFieldUseCase.execute({
                documentTypeId,
                workspaceId,
                userId: req.user!.userId,
                fieldKey,
                fieldType: fieldType as FieldType,
                isRequired: isRequired || false,
                isExpiryField: isExpiryField || false
            });

            res.status(201).json(this.presenter.presentField(field));
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /workspaces/:workspaceId/document-types/:id
     * Delete a document type
     */
    async deleteDocumentType(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaceId = req.params.workspaceId as string;
            const id = req.params.id as string;

            await this.deleteDocumentTypeUseCase.execute({
                id,
                workspaceId,
                userId: req.user!.userId
            });

            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}
