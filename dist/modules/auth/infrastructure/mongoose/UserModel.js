"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const mongoose_1 = require("mongoose");
const userSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    passwordHash: {
        type: String,
        required: true
    },
    name: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});
// Index for faster email lookups
userSchema.index({ email: 1 });
exports.UserModel = (0, mongoose_1.model)('User', userSchema);
