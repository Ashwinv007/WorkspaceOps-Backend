/**
 * DocumentStatus Enum
 * 
 * Represents the expiry status of a document based on its expiry date.
 * Used for filtering and display purposes.
 */
export enum DocumentStatus {
    VALID = 'VALID',       // No expiry date OR expiry > threshold days
    EXPIRING = 'EXPIRING', // Expiry within threshold days (default 30)
    EXPIRED = 'EXPIRED'     // Past expiry date
}
