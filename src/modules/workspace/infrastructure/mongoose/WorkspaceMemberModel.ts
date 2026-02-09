import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkspaceMemberDocument extends Document {
    workspaceId: string;
    userId: string;
    role: string;
    createdAt: Date;
}

const WorkspaceMemberSchema = new Schema({
    workspaceId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: {
        type: String,
        required: true,
        enum: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']
    },
    createdAt: { type: Date, default: Date.now }
});

// Composite index for uniqueness
WorkspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

export const WorkspaceMemberModel = mongoose.model<IWorkspaceMemberDocument>('WorkspaceMember', WorkspaceMemberSchema);
