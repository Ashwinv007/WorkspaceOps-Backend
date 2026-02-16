import mongoose, { Schema, Document } from 'mongoose';

/**
 * Entity Mongoose Schema
 * 
 * Maps to SQL table:
 * CREATE TABLE entities (
 *   id UUID PRIMARY KEY,
 *   workspace_id UUID NOT NULL REFERENCES workspaces(id),
 *   name VARCHAR(255) NOT NULL,
 *   role VARCHAR(20) NOT NULL CHECK (role IN ('SELF', 'CUSTOMER', 'EMPLOYEE', 'VENDOR')),
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 */

export interface IEntityDocument extends Document {
    workspaceId: mongoose.Types.ObjectId;
    name: string;
    role: 'SELF' | 'CUSTOMER' | 'EMPLOYEE' | 'VENDOR';
    createdAt: Date;
}

const EntitySchema = new Schema<IEntityDocument>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            index: true // Index for efficient workspace queries
        },
        name: {
            type: String,
            required: true,
            minlength: 1,
            maxlength: 255,
            trim: true
        },
        role: {
            type: String,
            enum: ['SELF', 'CUSTOMER', 'EMPLOYEE', 'VENDOR'],
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: false, // We manually manage createdAt to match SQL schema
        collection: 'entities'
    }
);

// Create compound index for workspace queries
EntitySchema.index({ workspaceId: 1, createdAt: -1 });

export const EntityModel = mongoose.model<IEntityDocument>('Entity', EntitySchema);
