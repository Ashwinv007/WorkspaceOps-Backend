import { ValidationError } from '../../../../shared/domain/errors/AppError';

/**
 * User Domain Entity (Pure TypeScript - No Framework Dependencies)
 * 
 * Represents a user in the system with business validation rules.
 * This is the core business object, independent of database or HTTP concerns.
 */
export class User {
    constructor(
        public readonly id: string,
        public readonly email: string,
        public readonly passwordHash: string,
        public readonly name?: string,
        public readonly createdAt?: Date,
        public readonly updatedAt?: Date
    ) {
        this.validate();
    }

    /**
     * Domain validation - ensures business rules are enforced
     */
    private validate(): void {
        if (!this.email || !this.email.trim()) {
            throw new ValidationError('Email is required');
        }

        if (!this.isValidEmail(this.email)) {
            throw new ValidationError('Invalid email format');
        }

        if (!this.passwordHash || !this.passwordHash.trim()) {
            throw new ValidationError('Password hash is required');
        }
    }

    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Factory method to create a new User (without ID - for creation)
     */
    static create(
        email: string,
        passwordHash: string,
        name?: string
    ): Omit<User, 'id' | 'createdAt' | 'updatedAt'> {
        // Validate before creating
        const tempUser = new User('temp', email, passwordHash, name);

        return {
            email: tempUser.email,
            passwordHash: tempUser.passwordHash,
            name: tempUser.name,
            validate: tempUser.validate.bind(tempUser)
        } as any;
    }

    /**
     * Update user's name (returns new instance - immutability)
     */
    updateName(newName: string): User {
        return new User(
            this.id,
            this.email,
            this.passwordHash,
            newName,
            this.createdAt,
            this.updatedAt
        );
    }

    /**
     * Check if email matches
     */
    hasEmail(email: string): boolean {
        return this.email.toLowerCase() === email.toLowerCase();
    }
}
