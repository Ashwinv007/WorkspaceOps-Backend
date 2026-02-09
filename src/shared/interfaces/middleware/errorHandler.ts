import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../domain/errors/AppError';

/**
 * Global Error Handler Middleware
 * 
 * Catches all errors and formats them consistently.
 */
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            error: {
                message: err.message,
                statusCode: err.statusCode
            }
        });
    }

    // Log unexpected errors
    console.error('Unexpected Error:', err);

    // Don't expose internal errors to client
    return res.status(500).json({
        success: false,
        error: {
            message: 'Internal server error',
            statusCode: 500
        }
    });
};
