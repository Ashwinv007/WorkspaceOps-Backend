import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkspaceDocument extends Document {
    tenantId: string;
    name: string;
    createdAt: Date;
}

const WorkspaceSchema = new Schema({
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

export const WorkspaceModel = mongoose.model<IWorkspaceDocument>('Workspace', WorkspaceSchema);
