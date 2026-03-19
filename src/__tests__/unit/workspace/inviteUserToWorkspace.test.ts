import { InviteUserToWorkspace } from '../../../modules/workspace/application/use-cases/InviteUserToWorkspace';
import { ValidationError, NotFoundError } from '../../../shared/domain/errors/AppError';
// Note: the real repo catches MongoDB duplicate key (11000) and re-throws as ValidationError.
// In unit tests we mock the repo's output directly, so we throw ValidationError ourselves.

const WORKSPACE_ID = '507f1f77bcf86cd799439011';
const USER_ID      = '507f1f77bcf86cd799439012';
const MEMBER_ID    = '507f1f77bcf86cd799439013';

const mockMember = { id: MEMBER_ID, workspaceId: WORKSPACE_ID, userId: USER_ID, role: 'MEMBER' };

describe('InviteUserToWorkspace use case', () => {
    let mockWorkspaceRepo: any;
    let mockWorkspaceMemberRepo: any;
    let mockUserRepo: any;
    let useCase: InviteUserToWorkspace;

    beforeEach(() => {
        mockWorkspaceRepo = {
            findById: jest.fn().mockResolvedValue({ id: WORKSPACE_ID, name: 'Test Workspace' }),
        };
        mockUserRepo = {
            findByEmail: jest.fn().mockResolvedValue({ id: USER_ID, email: 'user@test.com' }),
        };
        mockWorkspaceMemberRepo = {
            create: jest.fn().mockResolvedValue(mockMember),
        };
        useCase = new InviteUserToWorkspace(mockWorkspaceRepo, mockWorkspaceMemberRepo, mockUserRepo);
    });

    it('should invite user and return membership', async () => {
        const result = await useCase.execute({
            workspaceId: WORKSPACE_ID,
            invitedEmail: 'user@test.com',
            role: 'MEMBER',
            invitedByUserId: USER_ID,
        });

        expect(result).toBeDefined();
        expect(mockWorkspaceMemberRepo.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ValidationError for invalid workspaceId', async () => {
        await expect(
            useCase.execute({ workspaceId: 'bad-id', invitedEmail: 'user@test.com', role: 'MEMBER', invitedByUserId: USER_ID })
        ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when workspace does not exist', async () => {
        mockWorkspaceRepo.findById.mockResolvedValue(null);
        await expect(
            useCase.execute({ workspaceId: WORKSPACE_ID, invitedEmail: 'user@test.com', role: 'MEMBER', invitedByUserId: USER_ID })
        ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when email is not registered', async () => {
        mockUserRepo.findByEmail.mockResolvedValue(null);
        await expect(
            useCase.execute({ workspaceId: WORKSPACE_ID, invitedEmail: 'nobody@test.com', role: 'MEMBER', invitedByUserId: USER_ID })
        ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for invalid role', async () => {
        await expect(
            useCase.execute({ workspaceId: WORKSPACE_ID, invitedEmail: 'user@test.com', role: 'BADVALUE' as any, invitedByUserId: USER_ID })
        ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when user is already a member (duplicate)', async () => {
        // NEW: mockRejectedValue — make the repo THROW a MongoDB duplicate key error
        // MongoDB signals duplicates with error code 11000
        // FILL IN THIS LINE:
        mockWorkspaceMemberRepo.create.mockRejectedValue(new ValidationError('User is already a member of this workspace'));

        await expect(
            useCase.execute({ workspaceId: WORKSPACE_ID, invitedEmail: 'user@test.com', role: 'MEMBER', invitedByUserId: USER_ID })
        ).rejects.toThrow(ValidationError);
    });
});
