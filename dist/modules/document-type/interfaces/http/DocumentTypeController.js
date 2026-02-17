"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentTypeController = void 0;
const FieldType_1 = require("../../domain/enums/FieldType");
/**
 * Document Type Controller (Interfaces Layer)
 *
 * Handles HTTP requests for document type operations.
 * Delegates business logic to use cases and formats responses via presenter.
 */
class DocumentTypeController {
    constructor(createDocumentTypeUseCase, getDocumentTypesUseCase, getDocumentTypeByIdUseCase, updateDocumentTypeUseCase, addFieldUseCase, deleteDocumentTypeUseCase, presenter) {
        this.createDocumentTypeUseCase = createDocumentTypeUseCase;
        this.getDocumentTypesUseCase = getDocumentTypesUseCase;
        this.getDocumentTypeByIdUseCase = getDocumentTypeByIdUseCase;
        this.updateDocumentTypeUseCase = updateDocumentTypeUseCase;
        this.addFieldUseCase = addFieldUseCase;
        this.deleteDocumentTypeUseCase = deleteDocumentTypeUseCase;
        this.presenter = presenter;
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
    async createDocumentType(req, res, next) {
        try {
            const workspaceId = req.params.workspaceId;
            const { name, hasMetadata, hasExpiry, fields } = req.body;
            // Validate field types
            if (fields && Array.isArray(fields)) {
                for (const field of fields) {
                    if (!Object.values(FieldType_1.FieldType).includes(field.fieldType)) {
                        res.status(400).json({
                            error: `Invalid field type '${field.fieldType}'. Must be one of: ${Object.values(FieldType_1.FieldType).join(', ')}`
                        });
                        return;
                    }
                }
            }
            const result = await this.createDocumentTypeUseCase.execute({
                workspaceId,
                name,
                hasMetadata: hasMetadata || false,
                hasExpiry: hasExpiry || false,
                fields: fields || []
            });
            res.status(201).json(this.presenter.presentDocumentType(result.documentType, result.fields));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /workspaces/:workspaceId/document-types
     * Get all document types in a workspace
     */
    async getDocumentTypes(req, res, next) {
        try {
            const workspaceId = req.params.workspaceId;
            const documentTypes = await this.getDocumentTypesUseCase.execute({
                workspaceId
            });
            res.status(200).json(this.presenter.presentDocumentTypes(documentTypes));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /workspaces/:workspaceId/document-types/:id
     * Get a specific document type with its fields
     */
    async getDocumentTypeById(req, res, next) {
        try {
            const workspaceId = req.params.workspaceId;
            const id = req.params.id;
            const result = await this.getDocumentTypeByIdUseCase.execute({
                id,
                workspaceId
            });
            res.status(200).json(this.presenter.presentDocumentType(result.documentType, result.fields));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * PUT /workspaces/:workspaceId/document-types/:id
     * Update a document type
     */
    async updateDocumentType(req, res, next) {
        try {
            const workspaceId = req.params.workspaceId;
            const id = req.params.id;
            const { name, hasMetadata, hasExpiry } = req.body;
            const result = await this.updateDocumentTypeUseCase.execute({
                id,
                workspaceId,
                name,
                hasMetadata,
                hasExpiry
            });
            res.status(200).json(this.presenter.presentDocumentType(result.documentType, result.fields));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /workspaces/:workspaceId/document-types/:id/fields
     * Add a field to a document type
     */
    async addField(req, res, next) {
        try {
            const workspaceId = req.params.workspaceId;
            const documentTypeId = req.params.id;
            const { fieldKey, fieldType, isRequired, isExpiryField } = req.body;
            // Validate field type
            if (!Object.values(FieldType_1.FieldType).includes(fieldType)) {
                res.status(400).json({
                    error: `Invalid field type '${fieldType}'. Must be one of: ${Object.values(FieldType_1.FieldType).join(', ')}`
                });
                return;
            }
            const field = await this.addFieldUseCase.execute({
                documentTypeId,
                workspaceId,
                fieldKey,
                fieldType: fieldType,
                isRequired: isRequired || false,
                isExpiryField: isExpiryField || false
            });
            res.status(201).json(this.presenter.presentField(field));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * DELETE /workspaces/:workspaceId/document-types/:id
     * Delete a document type
     */
    async deleteDocumentType(req, res, next) {
        try {
            const workspaceId = req.params.workspaceId;
            const id = req.params.id;
            await this.deleteDocumentTypeUseCase.execute({
                id,
                workspaceId
            });
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
}
exports.DocumentTypeController = DocumentTypeController;
