import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { ITokenService } from '../services/ITokenService';
import { LoginDTO, LoginResponseDTO } from '../dto/LoginDTO';
import { UnauthorizedError } from '../../../../shared/domain/errors/AppError';

/**
 * Login User Use Case (Application Layer)
 * 
 * Authenticates a user and returns a JWT token.
 */
export class LoginUser {
    constructor(
        private readonly userRepo: IUserRepository,
        private readonly tokenService: ITokenService
    ) { }

    async execute(dto: LoginDTO): Promise<LoginResponseDTO> {
        // 1. Find user by email
        const user = await this.userRepo.findByEmail(dto.email);
        if (!user) {
            throw new UnauthorizedError('Invalid email or password');
        }

        // 2. Verify password
        const isPasswordValid = await this.tokenService.comparePassword(
            dto.password,
            user.passwordHash
        );

        if (!isPasswordValid) {
            throw new UnauthorizedError('Invalid email or password');
        }

        // 3. Generate token
        const token = this.tokenService.generateToken(user.id, user.email);

        return {
            userId: user.id,
            token
        };
    }
}
