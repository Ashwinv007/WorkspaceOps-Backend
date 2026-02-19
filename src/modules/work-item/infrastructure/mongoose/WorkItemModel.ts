import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

/**
 * WorkItem Mongoose Model
 * 
 * Maps to SQL: work_items
 * {
 *   id → _id (ObjectId),
 *   workspace_id → workspaceId (ObjectId ref Workspace),
 *   work_item_type_id → workItemTypeId (ObjectId ref WorkItemType),
 *   entity_id → entityId (ObjectId ref Entity),
 *   assigned_to_user_id → assignedToUserId (ObjectId ref User),
 *   title → title (String, required, max 255),
 *   description → description (String, optional),
 *   status → status (String, enum DRAFT|ACTIVE|COMPLETED),
 *   priority → priority (String, enum LOW|MEDIUM|HIGH, optional),
 *   due_date → dueDate (Date, optional),
 *   created_at → createdAt (via timestamps),
 *   updated_at → updatedAt (via timestamps)
 * }
 */

export interface IWorkItemModel extends MongooseDocument {
    workspaceId: mongoose.Types.ObjectId;
    workItemTypeId: mongoose.Types.ObjectId;
    entityId: mongoose.Types.ObjectId;
    assignedToUserId: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    status: string;
    priority?: string;
    dueDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const WorkItemSchema = new Schema<IWorkItemModel>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Workspace',
            index: true
        },
        workItemTypeId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'WorkItemType',
            index: true
        },
        entityId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Entity',
            index: true
        },
        assignedToUserId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        title: {
            type: String,
            required: true,
            maxlength: 255
        },
        description: {
            type: String,
            maxlength: 2000
        },
        status: {
            type: String,
            required: true,
            enum: ['DRAFT', 'ACTIVE', 'COMPLETED'],
            default: 'DRAFT'
        },
        priority: {
            type: String,
            enum: ['LOW', 'MEDIUM', 'HIGH']
        },
        dueDate: {
            type: Date
        }
    },
    {
        timestamps: true // Both createdAt AND updatedAt
    }
);

// Compound indexes for query performance
WorkItemSchema.index({ workspaceId: 1, status: 1 });
WorkItemSchema.index({ workspaceId: 1, assignedToUserId: 1 });
WorkItemSchema.index({ workspaceId: 1, workItemTypeId: 1 });
WorkItemSchema.index({ workspaceId: 1, entityId: 1 });

export const WorkItemModel = mongoose.model<IWorkItemModel>('WorkItem', WorkItemSchema);
