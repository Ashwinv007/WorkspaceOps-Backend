"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const AppError_1 = require("../../../../shared/domain/errors/AppError");
/**
 * User Domain Entity (Pure TypeScript - No Framework Dependencies)
 *
 * Represents a user in the system with business validation rules.
 * This is the core business object, independent of database or HTTP concerns.
 */
class User {
    constructor(id, email, passwordHash, name, createdAt, updatedAt) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.name = name;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.validate();
    }
    /**
     * Domain validation - ensures business rules are enforced
     */
    validate() {
        if (!this.email || !this.email.trim()) {
            throw new AppError_1.ValidationError('Email is required');
        }
        if (!this.isValidEmail(this.email)) {
            throw new AppError_1.ValidationError('Invalid email format');
        }
        if (!this.passwordHash || !this.passwordHash.trim()) {
            throw new AppError_1.ValidationError('Password hash is required');
        }
    }
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    /**
     * Factory method to create a new User (without ID - for creation)
     */
    static create(email, passwordHash, name) {
        // Validate before creating
        const tempUser = new User('temp', email, passwordHash, name);
        return {
            email: tempUser.email,
            passwordHash: tempUser.passwordHash,
            name: tempUser.name,
            validate: tempUser.validate.bind(tempUser)
        };
    }
    /**
     * Update user's name (returns new instance - immutability)
     */
    updateName(newName) {
        return new User(this.id, this.email, this.passwordHash, newName, this.createdAt, this.updatedAt);
    }
    /**
     * Check if email matches
     */
    hasEmail(email) {
        return this.email.toLowerCase() === email.toLowerCase();
    }
}
exports.User = User;
