/**
 * Token Service Interface (Application Layer Contract)
 * 
 * Defines the contract for authentication token operations.
 * The infrastructure layer will implement this using JWT.
 */
export interface ITokenService {
    /**
     * Generate JWT token for authenticated user
     */
    generateToken(userId: string, email: string): string;

    /**
     * Verify and decode JWT token
     * Returns user ID if valid, throws error if invalid
     */
    verifyToken(token: string): { userId: string; email: string };

    /**
     * Hash password using bcrypt
     */
    hashPassword(password: string): Promise<string>;

    /**
     * Compare plain password with hashed password
     */
    comparePassword(password: string, hash: string): Promise<boolean>;
}
