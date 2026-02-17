import mongoose from 'mongoose';
import { IDocumentTypeRepository } from '../../domain/repositories/IDocumentTypeRepository';
import { DocumentType } from '../../domain/entities/DocumentType';
import { DocumentTypeField } from '../../domain/entities/DocumentTypeField';
import { FieldType } from '../../domain/enums/FieldType';
import { DocumentTypeModel } from './DocumentTypeModel';
import { DocumentTypeFieldModel } from './DocumentTypeFieldModel';
import { AppError } from '../../../../shared/domain/errors/AppError';

/**
 * Document Type Repository Implementation (Infrastructure Layer)
 * 
 * Implements IDocumentTypeRepository using Mongoose.
 * Handles conversion between Mongoose documents and domain entities.
 */
export class DocumentTypeRepositoryImpl implements IDocumentTypeRepository {
    /**
     * Create a new document type with fields atomically
     */
    async create(
        documentType: Omit<DocumentType, 'id' | 'createdAt'>,
        fields: Omit<DocumentTypeField, 'id' | 'documentTypeId'>[]
    ): Promise<DocumentType> {
        // Note: Transactions removed for standalone MongoDB
        // TODO: Re-enable when using MongoDB replica set

        // Create document type
        const docTypeDoc = await DocumentTypeModel.create({
            workspaceId: documentType.workspaceId,
            name: documentType.name,
            hasMetadata: documentType.hasMetadata,
            hasExpiry: documentType.hasExpiry
        });

        // Create fields
        if (fields.length > 0) {
            await DocumentTypeFieldModel.insertMany(
                fields.map(f => ({
                    documentTypeId: docTypeDoc._id,
                    fieldKey: f.fieldKey,
                    fieldType: f.fieldType,
                    isRequired: f.isRequired,
                    isExpiryField: f.isExpiryField
                }))
            );
        }

        // Convert to domain entity
        return this.toDomainDocumentType(docTypeDoc);
    }

    /**
     * Find document type by ID (without fields)
     */
    async findById(id: string): Promise<DocumentType | null> {
        const doc = await DocumentTypeModel.findById(id);
        if (!doc) return null;

        return this.toDomainDocumentType(doc);
    }

    /**
     * Find all document types in a workspace (without fields)
     */
    async findByWorkspaceId(workspaceId: string): Promise<DocumentType[]> {
        const docTypeDocs = await DocumentTypeModel.find({ workspaceId });
        return docTypeDocs.map(doc => this.toDomainDocumentType(doc));
    }

    /**
     * Find document type by ID with all its fields
     */
    async findByIdWithFields(id: string): Promise<{ documentType: DocumentType; fields: DocumentTypeField[] } | null> {
        const docTypeDoc = await DocumentTypeModel.findById(id);
        if (!docTypeDoc) return null;

        const fieldDocs = await DocumentTypeFieldModel.find({
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
    async update(
        id: string,
        updates: Partial<Pick<DocumentType, 'name' | 'hasMetadata' | 'hasExpiry'>>
    ): Promise<DocumentType> {
        const doc = await DocumentTypeModel.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!doc) {
            throw new AppError('Document type not found', 404);
        }

        return this.toDomainDocumentType(doc);
    }

    /**
     * Delete document type and all its fields
     */
    async delete(id: string): Promise<void> {
        // Note: Transactions removed for standalone MongoDB
        // TODO: Re-enable when using MongoDB replica set

        // Delete all associated fields first
        await DocumentTypeFieldModel.deleteMany({ documentTypeId: id });

        // Delete document type
        await DocumentTypeModel.findByIdAndDelete(id);
    }

    /**
     * Add a new field to an existing document type
     */
    async addField(
        documentTypeId: string,
        field: Omit<DocumentTypeField, 'id'>
    ): Promise<DocumentTypeField> {
        const fieldDoc = await DocumentTypeFieldModel.create({
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
    async updateField(
        fieldId: string,
        updates: Partial<Omit<DocumentTypeField, 'id' | 'documentTypeId'>>
    ): Promise<DocumentTypeField> {
        const doc = await DocumentTypeFieldModel.findByIdAndUpdate(
            fieldId,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!doc) {
            throw new AppError('Field not found', 404);
        }

        return this.toDomainField(doc);
    }

    /**
     * Delete a field
     */
    async deleteField(fieldId: string): Promise<void> {
        await DocumentTypeFieldModel.findByIdAndDelete(fieldId);
    }

    /**
     * Get all fields for a document type
     */
    async getFields(documentTypeId: string): Promise<DocumentTypeField[]> {
        const fieldDocs = await DocumentTypeFieldModel.find({ documentTypeId });
        return fieldDocs.map(f => this.toDomainField(f));
    }

    /**
     * Convert Mongoose document to DocumentType domain entity
     */
    private toDomainDocumentType(doc: any): DocumentType {
        return new DocumentType(
            doc._id.toString(),
            doc.workspaceId.toString(),
            doc.name,
            doc.hasMetadata,
            doc.hasExpiry,
            doc.createdAt
        );
    }

    /**
     * Convert Mongoose document to DocumentTypeField domain entity
     */
    private toDomainField(doc: any): DocumentTypeField {
        return new DocumentTypeField(
            doc._id.toString(),
            doc.documentTypeId.toString(),
            doc.fieldKey,
            doc.fieldType as FieldType,
            doc.isRequired,
            doc.isExpiryField
        );
    }
}
