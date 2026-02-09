"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginUser = void 0;
const AppError_1 = require("../../../../shared/domain/errors/AppError");
/**
 * Login User Use Case (Application Layer)
 *
 * Authenticates a user and returns a JWT token.
 */
class LoginUser {
    constructor(userRepo, tokenService) {
        this.userRepo = userRepo;
        this.tokenService = tokenService;
    }
    async execute(dto) {
        // 1. Find user by email
        const user = await this.userRepo.findByEmail(dto.email);
        if (!user) {
            throw new AppError_1.UnauthorizedError('Invalid email or password');
        }
        // 2. Verify password
        const isPasswordValid = await this.tokenService.comparePassword(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new AppError_1.UnauthorizedError('Invalid email or password');
        }
        // 3. Generate token
        const token = this.tokenService.generateToken(user.id, user.email);
        return {
            userId: user.id,
            token
        };
    }
}
exports.LoginUser = LoginUser;
