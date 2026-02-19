import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

/**
 * WorkItemType Mongoose Model
 * 
 * Maps to SQL: work_item_types
 * {
 *   id → _id (ObjectId),
 *   workspace_id → workspaceId (ObjectId ref Workspace),
 *   name → name (String, max 255),
 *   description → description (String, optional),
 *   entity_type → entityType (String, enum, optional),
 *   created_at → createdAt (via timestamps)
 * }
 */

export interface IWorkItemTypeModel extends MongooseDocument {
    workspaceId: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    entityType?: string;
    createdAt: Date;
}

const WorkItemTypeSchema = new Schema<IWorkItemTypeModel>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Workspace',
            index: true
        },
        name: {
            type: String,
            required: true,
            maxlength: 255
        },
        description: {
            type: String,
            maxlength: 1000
        },
        entityType: {
            type: String,
            enum: ['SELF', 'CUSTOMER', 'EMPLOYEE', 'VENDOR']
        }
    },
    {
        timestamps: { createdAt: true, updatedAt: false }
    }
);

// Unique name per workspace (business rule)
WorkItemTypeSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

export const WorkItemTypeModel = mongoose.model<IWorkItemTypeModel>('WorkItemType', WorkItemTypeSchema);
