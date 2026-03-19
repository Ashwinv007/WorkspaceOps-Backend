import { SignupUser } from '../../../modules/auth/application/use-cases/SignupUser';
import { AppError } from '../../../shared/domain/errors/AppError';

const USER_ID      = '507f1f77bcf86cd799439011';
const TENANT_ID    = '507f1f77bcf86cd799439012';
const WORKSPACE_ID = '507f1f77bcf86cd799439013';
const MEMBER_ID    = '507f1f77bcf86cd799439014';

describe('SignupUser use case', () => {
    let mockUserRepo: any;
    let mockTenantRepo: any;
    let mockWorkspaceRepo: any;
    let mockWorkspaceMemberRepo: any;
    let mockTokenService: any;
    let useCase: SignupUser;

    beforeEach(() => {
        mockUserRepo = {
            findByEmail: jest.fn().mockResolvedValue(null), // default: email not taken
            save:        jest.fn().mockResolvedValue({ id: USER_ID, email: 'user@test.com', name: 'Test User' }),
        };
        mockTenantRepo = {
            create: jest.fn().mockResolvedValue({ id: TENANT_ID, name: "user@test.com's Tenant" }),
        };
        mockWorkspaceRepo = {
            create: jest.fn().mockResolvedValue({ id: WORKSPACE_ID, tenantId: TENANT_ID, name: 'Default Workspace' }),
        };
        mockWorkspaceMemberRepo = {
            create: jest.fn().mockResolvedValue({ id: MEMBER_ID, workspaceId: WORKSPACE_ID, userId: USER_ID, role: 'OWNER' }),
        };
        mockTokenService = {
            hashPassword:    jest.fn().mockResolvedValue('hashed_password'),
            generateToken:   jest.fn().mockReturnValue('jwt.token.here'), // sync — mockReturnValue not mockResolvedValue
            comparePassword: jest.fn().mockResolvedValue(true),
        };

        useCase = new SignupUser(
            mockUserRepo,
            mockTenantRepo,
            mockWorkspaceRepo,
            mockWorkspaceMemberRepo,
            mockTokenService
        );
    });

    it('should create user, workspace, and return token', async () => {
        const result = await useCase.execute({
            email: 'user@test.com',
            password: 'password123',
            name: 'Test User',
        });

        expect(result.userId).toBe(USER_ID);
        expect(result.workspaceId).toBe(WORKSPACE_ID);
        expect(result.token).toBe('jwt.token.here');

        expect(mockUserRepo.save).toHaveBeenCalledTimes(1);
        expect(mockTenantRepo.create).toHaveBeenCalledTimes(1);
        expect(mockWorkspaceRepo.create).toHaveBeenCalledTimes(1);
        expect(mockWorkspaceMemberRepo.create).toHaveBeenCalledTimes(1);
    });

    it('should throw AppError when email is already registered', async () => {
        mockUserRepo.findByEmail.mockResolvedValue({ id: USER_ID, email: 'user@test.com' });

        await expect(
            useCase.execute({ email: 'user@test.com', password: 'password123', name: 'Test User' })
        ).rejects.toThrow(AppError);
    });

    it('should NOT create user when email is already taken', async () => {
        mockUserRepo.findByEmail.mockResolvedValue({ id: USER_ID, email: 'user@test.com' });

        await expect(
            useCase.execute({ email: 'user@test.com', password: 'password123', name: 'Test User' })
        ).rejects.toThrow();

        expect(mockUserRepo.save).not.toHaveBeenCalled();
    });
});
