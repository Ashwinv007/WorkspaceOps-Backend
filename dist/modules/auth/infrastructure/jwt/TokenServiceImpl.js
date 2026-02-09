"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenServiceImpl = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../../../../config/env");
const AppError_1 = require("../../../../shared/domain/errors/AppError");
/**
 * Token Service Implementation (Infrastructure Layer)
 *
 * Implements JWT and password hashing using external libraries.
 * The application layer doesn't know about bcrypt or jsonwebtoken.
 */
class TokenServiceImpl {
    constructor() {
        this.JWT_EXPIRY = '24h'; // 24 hours as per requirements
        this.JWT_SECRET = env_1.env.jwtSecret;
    }
    generateToken(userId, email) {
        return jsonwebtoken_1.default.sign({ userId, email }, this.JWT_SECRET, { expiresIn: this.JWT_EXPIRY });
    }
    verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.JWT_SECRET);
            return {
                userId: decoded.userId,
                email: decoded.email
            };
        }
        catch (error) {
            throw new AppError_1.UnauthorizedError('Invalid or expired token');
        }
    }
    async hashPassword(password) {
        const saltRounds = 10;
        return bcrypt_1.default.hash(password, saltRounds);
    }
    async comparePassword(password, hash) {
        return bcrypt_1.default.compare(password, hash);
    }
}
exports.TokenServiceImpl = TokenServiceImpl;
