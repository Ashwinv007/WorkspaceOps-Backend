/**
 * Field Type Enum
 * 
 * Defines the allowed data types for document type fields.
 * Maps to SQL: field_type VARCHAR(20) CHECK (field_type IN ('text', 'date'))
 */
export enum FieldType {
    TEXT = 'text',
    DATE = 'date'
}
