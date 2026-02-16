"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidObjectId = isValidObjectId;
exports.isValidEmail = isValidEmail;
exports.hasMinLength = hasMinLength;
const mongoose_1 = __importDefault(require("mongoose"));
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
function isValidObjectId(id) {
    if (!id || typeof id !== 'string') {
        return false;
    }
    return mongoose_1.default.Types.ObjectId.isValid(id);
}
/**
 * Validates if a string is a valid email format
 *
 * @param email - The email string to validate
 * @returns true if valid email format, false otherwise
 */
function isValidEmail(email) {
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
function hasMinLength(value, minLength) {
    if (!value || typeof value !== 'string') {
        return false;
    }
    return value.trim().length >= minLength;
}
