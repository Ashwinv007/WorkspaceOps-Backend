import multer from 'multer';
import { Request } from 'express';
import { ValidationError } from '../../../../shared/domain/errors/AppError';

/**
 * Multer Configuration for File Uploads
 * 
 * - Storage: Memory (buffer in memory until processed)
 * - Size limit: Configurable via env (default 10MB)
 * - File types: All allowed for MVP
 */

// Read config from environment
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10);
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Multer storage configuration (memory storage)
 */
const storage = multer.memoryStorage();

/**
 * File filter (optional - can restrict file types here)
 */
const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    // For MVP, accept all file types
    // Future: Add mime type validation if needed
    cb(null, true);
};

/**
 * Multer upload middleware configuration
 */
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE_BYTES
    }
});

/**
 * Error handler for multer errors
 */
export const handleMulterError = (error: any) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            throw new ValidationError(
                `File size exceeds maximum limit of ${MAX_FILE_SIZE_MB}MB`
            );
        }
        throw new ValidationError(`File upload error: ${error.message}`);
    }
    throw error;
};
