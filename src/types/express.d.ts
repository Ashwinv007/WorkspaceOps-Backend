/**
 * TypeScript Type Extensions for Express
 * 
 * Extends Express Request interface to include user context
 * populated by auth middleware.
 */

declare namespace Express {
    export interface Request {
        user?: {
            userId: string;
            email: string;
        };
    }
}
