import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

/**
 * MongoDB Document Interface
 */
interface IDocumentModel extends MongooseDocument {
    workspaceId: mongoose.Types.ObjectId;
    documentTypeId: mongoose.Types.ObjectId;
    entityId?: mongoose.Types.ObjectId;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType?: string;
    metadata?: Record<string, any>;
    expiryDate?: Date;
    uploadedBy: mongoose.Types.ObjectId;
    createdAt: Date;
}

/**
 * Document Schema
 * 
 * Maps to the official MongoDB schema from mongodb-schema.pdf
 */
const DocumentSchema = new Schema<IDocumentModel>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Workspace',
            index: true
        },
        documentTypeId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'DocumentType',
            index: true
        },
        entityId: {
            type: Schema.Types.ObjectId,
            ref: 'Entity',
            default: null,
            index: true
        },
        fileName: {
            type: String,
            required: true,
            maxlength: 255
        },
        fileUrl: {
            type: String,
            required: true
        },
        fileSize: {
            type: Number,
            required: true,
            min: 1
        },
        mimeType: {
            type: String,
            required: false
        },
        metadata: {
            type: Schema.Types.Mixed,
            default: null
        },
        expiryDate: {
            type: Date,
            required: false,
            index: true
        },
        uploadedBy: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        }
    },
    {
        timestamps: { createdAt: true, updatedAt: false }
    }
);

// Compound indexes for efficient queries
DocumentSchema.index({ workspaceId: 1, documentTypeId: 1 });
DocumentSchema.index({ workspaceId: 1, entityId: 1 });
DocumentSchema.index({ workspaceId: 1, expiryDate: 1 });

export const DocumentModel = mongoose.model<IDocumentModel>('Document', DocumentSchema);
