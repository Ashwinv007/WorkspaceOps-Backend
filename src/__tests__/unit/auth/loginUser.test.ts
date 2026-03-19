import { LoginUser } from '../../../modules/auth/application/use-cases/LoginUser';
import { UnauthorizedError } from '../../../shared/domain/errors/AppError';

const USER_ID = '507f1f77bcf86cd799439011';

const mockUser = {
    id: USER_ID,
    email: 'user@test.com',
    passwordHash: 'hashed_password',
};

describe('LoginUser use case', () => {
    let mockUserRepo: any;
    let mockTokenService: any;
    let useCase: LoginUser;

    beforeEach(() => {
        mockUserRepo = {
            findByEmail: jest.fn().mockResolvedValue(mockUser),
        };
        mockTokenService = {
            comparePassword: jest.fn().mockResolvedValue(true),
            // NOTE: generateToken is synchronous — no await in the source code.
            // So we use mockReturnValue (not mockResolvedValue) here.
            generateToken: jest.fn().mockReturnValue('jwt.token.here'),
        };
        useCase = new LoginUser(mockUserRepo, mockTokenService);
    });

    it('should return userId and token on successful login', async () => {
        const result = await useCase.execute({ email: 'user@test.com', password: 'password123' });

        expect(result.userId).toBe(USER_ID);
        expect(result.token).toBe('jwt.token.here');
        expect(mockTokenService.comparePassword).toHaveBeenCalledTimes(1);
        expect(mockTokenService.generateToken).toHaveBeenCalledWith(USER_ID, 'user@test.com');
    });

    it('should throw UnauthorizedError when email is not registered', async () => {
        mockUserRepo.findByEmail.mockResolvedValue(null);

        await expect(
            useCase.execute({ email: 'nobody@test.com', password: 'password123' })
        ).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError when password is wrong', async () => {
        mockTokenService.comparePassword.mockResolvedValue(false);

        await expect(
            useCase.execute({ email: 'user@test.com', password: 'wrongpassword' })
        ).rejects.toThrow(UnauthorizedError);
    });

    it('should NOT generate a token when password is wrong', async () => {
        mockTokenService.comparePassword.mockResolvedValue(false);

        await expect(
            useCase.execute({ email: 'user@test.com', password: 'wrongpassword' })
        ).rejects.toThrow();

        expect(mockTokenService.generateToken).not.toHaveBeenCalled();
    });
});
