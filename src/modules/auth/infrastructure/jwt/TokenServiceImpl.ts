import bcrypt from 'bcrypt';
import jwt, { Secret } from 'jsonwebtoken';
import { ITokenService } from '../../application/services/ITokenService';
import { env } from '../../../../config/env';
import { UnauthorizedError } from '../../../../shared/domain/errors/AppError';

/**
 * Token Service Implementation (Infrastructure Layer)
 * 
 * Implements JWT and password hashing using external libraries.
 * The application layer doesn't know about bcrypt or jsonwebtoken.
 */
export class TokenServiceImpl implements ITokenService {
    private readonly JWT_SECRET: Secret;
    private readonly JWT_EXPIRY: string = '24h'; // 24 hours as per requirements

    constructor() {
        this.JWT_SECRET = env.jwtSecret as Secret;
    }

    generateToken(userId: string, email: string): string {
        return jwt.sign(
            { userId, email },
            this.JWT_SECRET,
            { expiresIn: this.JWT_EXPIRY } as jwt.SignOptions
        );
    }

    verifyToken(token: string): { userId: string; email: string } {
        try {
            const decoded = jwt.verify(token, this.JWT_SECRET) as any;
            return {
                userId: decoded.userId,
                email: decoded.email
            };
        } catch (error) {
            throw new UnauthorizedError('Invalid or expired token');
        }
    }

    async hashPassword(password: string): Promise<string> {
        const saltRounds = 10;
        return bcrypt.hash(password, saltRounds);
    }

    async comparePassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }
}
