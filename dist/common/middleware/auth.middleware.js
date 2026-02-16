"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const TokenServiceImpl_1 = require("../../modules/auth/infrastructure/jwt/TokenServiceImpl");
const AppError_1 = require("../../shared/domain/errors/AppError");
/**
 * Auth Middleware
 *
 * Verifies JWT token from Authorization header and attaches user context to request.
 *
 * Usage:
 *   router.get('/protected', authMiddleware, controller.method)
 */
// Create a single instance to be reused across requests
const tokenService = new TokenServiceImpl_1.TokenServiceImpl();
const authMiddleware = (req, res, next) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        console.log('Auth check:', {
            header: authHeader ? 'Present' : 'Missing',
            url: req.url,
            method: req.method
        });
        if (!authHeader) {
            throw new AppError_1.UnauthorizedError('No authorization token provided');
        }
        // Expected format: "Bearer <token>"
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            throw new AppError_1.UnauthorizedError('Invalid authorization header format. Expected: Bearer <token>');
        }
        const token = parts[1];
        console.log('Token extracted:', token.substring(0, 10) + '...');
        // Verify token and extract user info
        const decoded = tokenService.verifyToken(token);
        console.log('Token verified for user:', decoded.userId);
        // Attach user context to request
        req.user = {
            userId: decoded.userId,
            email: decoded.email
        };
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        // Pass to error handling middleware
        next(error);
    }
};
exports.authMiddleware = authMiddleware;
