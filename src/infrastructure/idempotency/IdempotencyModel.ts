import mongoose, { Schema } from 'mongoose';

/**
 * IdempotencyRecord Schema
 *
 * Stores the result of mutation requests so that retries return the same
 * response instead of creating duplicate records.
 *
 * Key: SHA-256 hash of (userId + method + path + sortedBodyHash)
 * TTL: 24 hours — automatically cleaned up by MongoDB's TTL index.
 */
const IdempotencyRecordSchema = new Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    statusCode: {
        type: Number,
        required: true,
    },
    responseBody: {
        type: Schema.Types.Mixed,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        // TTL index: MongoDB automatically deletes documents 24h after createdAt
        expires: 86400,
    },
});

export const IdempotencyModel = mongoose.model('IdempotencyRecord', IdempotencyRecordSchema);
