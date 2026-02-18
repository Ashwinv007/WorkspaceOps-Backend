"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentTypeRepositoryImpl = void 0;
const DocumentType_1 = require("../../domain/entities/DocumentType");
const DocumentTypeField_1 = require("../../domain/entities/DocumentTypeField");
const DocumentTypeModel_1 = require("./DocumentTypeModel");
const DocumentTypeFieldModel_1 = require("./DocumentTypeFieldModel");
const AppError_1 = require("../../../../shared/domain/errors/AppError");
/**
 * Document Type Repository Implementation (Infrastructure Layer)
 *
 * Implements IDocumentTypeRepository using Mongoose.
 * Handles conversion between Mongoose documents and domain entities.
 */
class DocumentTypeRepositoryImpl {
    /**
     * Create a new document type with fields atomically
     */
    async create(documentType, fields) {
        // Note: Transactions removed for standalone MongoDB
        // TODO: Re-enable when using MongoDB replica set
        // Create document type
        const docTypeDoc = await DocumentTypeModel_1.DocumentTypeModel.create({
            workspaceId: documentType.workspaceId,
            name: documentType.name,
            hasMetadata: documentType.hasMetadata,
            hasExpiry: documentType.hasExpiry
        });
        // Create fields
        if (fields.length > 0) {
            await DocumentTypeFieldModel_1.DocumentTypeFieldModel.insertMany(fields.map(f => ({
                documentTypeId: docTypeDoc._id,
                fieldKey: f.fieldKey,
                fieldType: f.fieldType,
                isRequired: f.isRequired,
                isExpiryField: f.isExpiryField
            })));
        }
        // Convert to domain entity
        return this.toDomainDocumentType(docTypeDoc);
    }
    /**
     * Find document type by ID (without fields)
     */
    async findById(id) {
        const doc = await DocumentTypeModel_1.DocumentTypeModel.findById(id);
        if (!doc)
            return null;
        return this.toDomainDocumentType(doc);
    }
    /**
     * Find all document types in a workspace (without fields)
     */
    async findByWorkspaceId(workspaceId) {
        const docTypeDocs = await DocumentTypeModel_1.DocumentTypeModel.find({ workspaceId });
        return docTypeDocs.map(doc => this.toDomainDocumentType(doc));
    }
    /**
     * Find document type by ID with all its fields
     */
    async findByIdWithFields(id) {
        const docTypeDoc = await DocumentTypeModel_1.DocumentTypeModel.findById(id);
        if (!docTypeDoc)
            return null;
        const fieldDocs = await DocumentTypeFieldModel_1.DocumentTypeFieldModel.find({
            documentTypeId: docTypeDoc._id
        });
        return {
            documentType: this.toDomainDocumentType(docTypeDoc),
            fields: fieldDocs.map(f => this.toDomainField(f))
        };
    }
    /**
     * Update document type metadata
     */
    async update(id, updates) {
        const doc = await DocumentTypeModel_1.DocumentTypeModel.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
        if (!doc) {
            throw new AppError_1.AppError('Document type not found', 404);
        }
        return this.toDomainDocumentType(doc);
    }
    /**
     * Delete document type and all its fields
     */
    async delete(id) {
        // Note: Transactions removed for standalone MongoDB
        // TODO: Re-enable when using MongoDB replica set
        // Delete all associated fields first
        await DocumentTypeFieldModel_1.DocumentTypeFieldModel.deleteMany({ documentTypeId: id });
        // Delete document type
        await DocumentTypeModel_1.DocumentTypeModel.findByIdAndDelete(id);
    }
    /**
     * Add a new field to an existing document type
     */
    async addField(documentTypeId, field) {
        const fieldDoc = await DocumentTypeFieldModel_1.DocumentTypeFieldModel.create({
            documentTypeId,
            fieldKey: field.fieldKey,
            fieldType: field.fieldType,
            isRequired: field.isRequired,
            isExpiryField: field.isExpiryField
        });
        return this.toDomainField(fieldDoc);
    }
    /**
     * Update a field
     */
    async updateField(fieldId, updates) {
        const doc = await DocumentTypeFieldModel_1.DocumentTypeFieldModel.findByIdAndUpdate(fieldId, { $set: updates }, { new: true, runValidators: true });
        if (!doc) {
            throw new AppError_1.AppError('Field not found', 404);
        }
        return this.toDomainField(doc);
    }
    /**
     * Delete a field
     */
    async deleteField(fieldId) {
        await DocumentTypeFieldModel_1.DocumentTypeFieldModel.findByIdAndDelete(fieldId);
    }
    /**
     * Get all fields for a document type
     */
    async getFields(documentTypeId) {
        const fieldDocs = await DocumentTypeFieldModel_1.DocumentTypeFieldModel.find({ documentTypeId });
        return fieldDocs.map(f => this.toDomainField(f));
    }
    /**
     * Convert Mongoose document to DocumentType domain entity
     */
    toDomainDocumentType(doc) {
        return new DocumentType_1.DocumentType(doc._id.toString(), doc.workspaceId.toString(), doc.name, doc.hasMetadata, doc.hasExpiry, doc.createdAt);
    }
    /**
     * Convert Mongoose document to DocumentTypeField domain entity
     */
    toDomainField(doc) {
        return new DocumentTypeField_1.DocumentTypeField(doc._id.toString(), doc.documentTypeId.toString(), doc.fieldKey, doc.fieldType, doc.isRequired, doc.isExpiryField);
    }
}
exports.DocumentTypeRepositoryImpl = DocumentTypeRepositoryImpl;
