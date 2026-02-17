"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentTypeFieldModel = void 0;
const mongoose_1 = require("mongoose");
/**
 * Mongoose Schema for DocumentTypeField
 *
 * Maps to SQL table:
 * CREATE TABLE document_type_fields (
 *   id UUID PRIMARY KEY,
 *   document_type_id UUID NOT NULL REFERENCES document_types(id),
 *   field_key VARCHAR(100) NOT NULL,
 *   field_type VARCHAR(20) NOT NULL CHECK (field_type IN ('text', 'date')),
 *   is_required BOOLEAN DEFAULT FALSE,
 *   is_expiry_field BOOLEAN DEFAULT FALSE
 * );
 */
const documentTypeFieldSchema = new mongoose_1.Schema({
    documentTypeId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'DocumentType',
        required: true,
        index: true
    },
    fieldKey: {
        type: String,
        required: true,
        maxlength: 100,
        trim: true
    },
    fieldType: {
        type: String,
        enum: ['text', 'date'],
        required: true
    },
    isRequired: {
        type: Boolean,
        default: false
    },
    isExpiryField: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    collection: 'document_type_fields'
});
// Compound index for uniqueness and queries
documentTypeFieldSchema.index({ documentTypeId: 1, fieldKey: 1 }, { unique: true });
// Index for document type queries
documentTypeFieldSchema.index({ documentTypeId: 1 });
exports.DocumentTypeFieldModel = (0, mongoose_1.model)('DocumentTypeField', documentTypeFieldSchema);
