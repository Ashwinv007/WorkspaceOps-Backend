import mongoose, { Schema, Document } from 'mongoose';

/**
 * AuditLog Mongoose Model
 *
 * Maps to SQL: audit_logs
 * {
 *   id           → _id (ObjectId),
 *   workspace_id → workspaceId (ObjectId ref Workspace),
 *   user_id      → userId (ObjectId ref User),
 *   action       → action (String, required),
 *   target_type  → targetType (String, required),
 *   target_id    → targetId (String, nullable),
 *   created_at   → createdAt (via timestamps)
 * }
 *
 * NOTE: No updatedAt — audit logs are append-only and immutable.
 */

export interface IAuditLogDocument extends Document {
    workspaceId: mongoose.Types.ObjectId;  // SQL: workspace_id
    userId: mongoose.Types.ObjectId;  // SQL: user_id
    action: string;                   // SQL: action VARCHAR(100)
    targetType: string;                   // SQL: target_type VARCHAR(50)
    targetId?: string;                   // SQL: target_id UUID (nullable)
    createdAt: Date;                     // SQL: created_at (auto-set)
}

const AuditLogSchema = new Schema<IAuditLogDocument>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Workspace',
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User',
            index: true,
        },
        action: {
            type: String,
            required: true,
        },
        targetType: {
            type: String,
            required: true,
        },
        targetId: {
            type: String,
            default: null, // nullable, like SQL
        },
    },
    {
        // Only createdAt — no updatedAt (append-only records)
        timestamps: { createdAt: 'createdAt', updatedAt: false },
    }
);

// Compound indexes for efficient workspace-level queries
AuditLogSchema.index({ workspaceId: 1, createdAt: -1 }); // primary: recent logs per workspace
AuditLogSchema.index({ workspaceId: 1, userId: 1 });      // filter by actor
AuditLogSchema.index({ workspaceId: 1, action: 1 });      // filter by action type

export const AuditLogModel = mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);
