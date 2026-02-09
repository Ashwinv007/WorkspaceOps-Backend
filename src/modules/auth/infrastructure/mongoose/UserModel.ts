import { Schema, model, Document as MongooseDocument } from 'mongoose';

/**
 * Mongoose User Schema (Infrastructure Layer)
 * 
 * This is the database-specific implementation.
 * It knows about Mongoose but the domain layer doesn't know about this.
 */
interface IUserDocument extends MongooseDocument {
    email: string;
    passwordHash: string;
    name?: string;
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new Schema<IUserDocument>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        passwordHash: {
            type: String,
            required: true
        },
        name: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

// Index for faster email lookups
userSchema.index({ email: 1 });

export const UserModel = model<IUserDocument>('User', userSchema);
