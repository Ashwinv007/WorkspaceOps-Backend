import { UpdateWorkspaceMember } from '../../../modules/workspace/application/use-cases/UpdateWorkspaceMember';
import { ValidationError, NotFoundError } from '../../../shared/domain/errors/AppError';

const WORKSPACE_ID = '507f1f77bcf86cd799439011';
const MEMBER_ID    = '507f1f77bcf86cd799439012';
const USER_ID      = '507f1f77bcf86cd799439013';

const mockMember = { id: MEMBER_ID, workspaceId: WORKSPACE_ID, userId: USER_ID, role: 'MEMBER' };

describe('UpdateWorkspaceMember use case', () => {
    let mockWorkspaceMemberRepo: any;
    let useCase: UpdateWorkspaceMember;

    beforeEach(() => {
        mockWorkspaceMemberRepo = {
            findByWorkspaceId: jest.fn().mockResolvedValue([mockMember]),
            countByRole:       jest.fn().mockResolvedValue(2), // 2 owners — safe to change
            update:            jest.fn().mockResolvedValue({ ...mockMember, role: 'ADMIN' }),
        };
        useCase = new UpdateWorkspaceMember(mockWorkspaceMemberRepo);
    });

    it('should update member role successfully', async () => {
        const result = await useCase.execute({
            workspaceId: WORKSPACE_ID,
            memberId: MEMBER_ID,
            newRole: 'ADMIN',
            updatedByUserId: USER_ID,
        });

        expect(result.role).toBe('ADMIN');
        expect(mockWorkspaceMemberRepo.update).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundError when member does not exist', async () => {
        mockWorkspaceMemberRepo.findByWorkspaceId.mockResolvedValue([]);
        await expect(
            useCase.execute({ workspaceId: WORKSPACE_ID, memberId: MEMBER_ID, newRole: 'ADMIN', updatedByUserId: USER_ID })
        ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when demoting the last owner', async () => {
        mockWorkspaceMemberRepo.findByWorkspaceId.mockResolvedValue([
            { id: MEMBER_ID, workspaceId: WORKSPACE_ID, userId: USER_ID, role: 'OWNER' },
        ]);
        mockWorkspaceMemberRepo.countByRole.mockResolvedValue(1); // only 1 owner
        await expect(
            useCase.execute({ workspaceId: WORKSPACE_ID, memberId: MEMBER_ID, newRole: 'MEMBER', updatedByUserId: USER_ID })
        ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid role', async () => {
        await expect(
            useCase.execute({ workspaceId: WORKSPACE_ID, memberId: MEMBER_ID, newRole: 'SUPERADMIN' as any, updatedByUserId: USER_ID })
        ).rejects.toThrow(ValidationError);
    });
});
