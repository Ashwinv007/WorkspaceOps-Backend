"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
/**
 * Auth Controller (Interfaces Layer)
 *
 * Handles HTTP requests and responses.
 * Transforms HTTP requests into DTOs, calls use cases, and formats responses.
 * Uses dependency injection - receives use cases via constructor.
 */
class AuthController {
    constructor(signupUseCase, loginUseCase, presenter) {
        this.signupUseCase = signupUseCase;
        this.loginUseCase = loginUseCase;
        this.presenter = presenter;
        /**
         * POST /auth/signup
         */
        this.signup = async (req, res, next) => {
            try {
                const result = await this.signupUseCase.execute(req.body);
                res.status(201).json(this.presenter.toSignupResponse(result));
            }
            catch (error) {
                next(error); // Pass to error handling middleware
            }
        };
        /**
         * POST /auth/login
         */
        this.login = async (req, res, next) => {
            try {
                const result = await this.loginUseCase.execute(req.body);
                res.status(200).json(this.presenter.toLoginResponse(result));
            }
            catch (error) {
                next(error);
            }
        };
    }
}
exports.AuthController = AuthController;
