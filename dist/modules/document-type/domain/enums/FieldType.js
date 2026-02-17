"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldType = void 0;
/**
 * Field Type Enum
 *
 * Defines the allowed data types for document type fields.
 * Maps to SQL: field_type VARCHAR(20) CHECK (field_type IN ('text', 'date'))
 */
var FieldType;
(function (FieldType) {
    FieldType["TEXT"] = "text";
    FieldType["DATE"] = "date";
})(FieldType || (exports.FieldType = FieldType = {}));
