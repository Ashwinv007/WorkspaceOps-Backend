"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepositoryImpl = void 0;
const User_1 = require("../../domain/entities/User");
const UserModel_1 = require("./UserModel");
/**
 * User Repository Implementation (Infrastructure Layer)
 *
 * Implements the IUserRepository interface using Mongoose.
 * Converts between domain entities and Mongoose documents.
 * The application layer doesn't know this exists - it only knows the interface.
 */
class UserRepositoryImpl {
    async findById(id) {
        const doc = await UserModel_1.UserModel.findById(id);
        if (!doc)
            return null;
        return this.toDomain(doc);
    }
    async findByEmail(email) {
        const doc = await UserModel_1.UserModel.findOne({ email: email.toLowerCase() });
        if (!doc)
            return null;
        return this.toDomain(doc);
    }
    async save(user) {
        const doc = await UserModel_1.UserModel.create({
            email: user.email,
            passwordHash: user.passwordHash,
            name: user.name
        });
        return this.toDomain(doc);
    }
    async delete(id) {
        await UserModel_1.UserModel.findByIdAndDelete(id);
    }
    /**
     * Convert Mongoose document to domain entity
     * This is the adapter pattern - adapting database model to domain model
     */
    toDomain(doc) {
        return new User_1.User(doc._id.toString(), doc.email, doc.passwordHash, doc.name, doc.createdAt, doc.updatedAt);
    }
}
exports.UserRepositoryImpl = UserRepositoryImpl;
