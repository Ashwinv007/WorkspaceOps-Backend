import mongoose from 'mongoose';

/**
 * Validation Utilities
 * 
 * Common validation functions used across the application
 */

/**
 * Validates if a string is a valid MongoDB ObjectID
 * 
 * @param id - The ID string to validate
 * @returns true if valid ObjectID format, false otherwise
 */
export function isValidObjectId(id: string): boolean {
    if (!id || typeof id !== 'string') {
        return false;
    }

    return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Validates if a string is a valid email format
 * 
 * @param email - The email string to validate
 * @returns true if valid email format, false otherwise
 */
export function isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
        return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validates if a string meets minimum length requirement
 * 
 * @param value - The string to validate
 * @param minLength - Minimum required length
 * @returns true if meets requirement, false otherwise
 */
export function hasMinLength(value: string, minLength: number): boolean {
    if (!value || typeof value !== 'string') {
        return false;
    }

    return value.trim().length >= minLength;
}
