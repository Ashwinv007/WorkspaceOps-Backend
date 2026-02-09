"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const AppError_1 = require("../../domain/errors/AppError");
/**
 * Global Error Handler Middleware
 *
 * Catches all errors and formats them consistently.
 */
const errorHandler = (err, req, res, next) => {
    if (err instanceof AppError_1.AppError) {
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
exports.errorHandler = errorHandler;
