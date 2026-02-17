import { Schema, model } from 'mongoose';

/**
 * Mongoose Schema for DocumentType
 * 
 * Maps to SQL table:
 * CREATE TABLE document_types (
 *   id UUID PRIMARY KEY,
 *   workspace_id UUID NOT NULL REFERENCES workspaces(id),
 *   name VARCHAR(255) NOT NULL,
 *   has_metadata BOOLEAN DEFAULT FALSE,
 *   has_expiry BOOLEAN DEFAULT FALSE
 * );
 */

const documentTypeSchema = new Schema(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            index: true
        },
        name: {
            type: String,
            required: true,
            maxlength: 255,
            trim: true
        },
        hasMetadata: {
            type: Boolean,
            default: false
        },
        hasExpiry: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true,
        collection: 'document_types'
    }
);

// Index for workspace queries
documentTypeSchema.index({ workspaceId: 1 });

export const DocumentTypeModel = model('DocumentType', documentTypeSchema);
