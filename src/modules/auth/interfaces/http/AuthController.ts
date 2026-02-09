import { Request, Response, NextFunction } from 'express';
import { SignupUser } from '../../application/use-cases/SignupUser';
import { LoginUser } from '../../application/use-cases/LoginUser';
import { UserPresenter } from '../presenters/UserPresenter';
import { AppError } from '../../../../shared/domain/errors/AppError';

/**
 * Auth Controller (Interfaces Layer)
 * 
 * Handles HTTP requests and responses.
 * Transforms HTTP requests into DTOs, calls use cases, and formats responses.
 * Uses dependency injection - receives use cases via constructor.
 */
export class AuthController {
    constructor(
        private readonly signupUseCase: SignupUser,
        private readonly loginUseCase: LoginUser,
        private readonly presenter: UserPresenter
    ) { }

    /**
     * POST /auth/signup
     */
    signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.signupUseCase.execute(req.body);
            res.status(201).json(this.presenter.toSignupResponse(result));
        } catch (error) {
            next(error); // Pass to error handling middleware
        }
    };

    /**
     * POST /auth/login
     */
    login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.loginUseCase.execute(req.body);
            res.status(200).json(this.presenter.toLoginResponse(result));
        } catch (error) {
            next(error);
        }
    };
}
