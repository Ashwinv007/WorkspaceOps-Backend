import mongoose, { Schema, Document } from 'mongoose';

export interface ITenantDocument extends Document {
    name: string;
    createdAt: Date;
}

const TenantSchema = new Schema({
    name: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

export const TenantModel = mongoose.model<ITenantDocument>('Tenant', TenantSchema);
