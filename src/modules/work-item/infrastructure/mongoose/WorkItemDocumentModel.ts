import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

/**
 * WorkItemDocument Mongoose Model
 * 
 * Separate collection for work item ↔ document linking.
 * Maps to SQL: work_item_documents junction table.
 * 
 * Per MongoDB schema PDF: "Why NOT embed documents in workItems:
 * Documents can be reused, avoid duplication, avoid bloated work item docs"
 * 
 * {
 *   id → _id (ObjectId),
 *   work_item_id → workItemId (ObjectId ref WorkItem),
 *   document_id → documentId (ObjectId ref Document),
 *   linked_at → linkedAt (via timestamps: createdAt renamed to linkedAt)
 * }
 */

export interface IWorkItemDocumentModel extends MongooseDocument {
    workItemId: mongoose.Types.ObjectId;
    documentId: mongoose.Types.ObjectId;
    linkedAt: Date;
}

const WorkItemDocumentSchema = new Schema<IWorkItemDocumentModel>(
    {
        workItemId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'WorkItem',
            index: true
        },
        documentId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Document'
        }
    },
    {
        timestamps: { createdAt: 'linkedAt', updatedAt: false }
    }
);

// Unique constraint: mirrors SQL UNIQUE(work_item_id, document_id)
WorkItemDocumentSchema.index({ workItemId: 1, documentId: 1 }, { unique: true });

export const WorkItemDocumentModel = mongoose.model<IWorkItemDocumentModel>('WorkItemDocument', WorkItemDocumentSchema);
