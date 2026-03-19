import { RemoveUserFromWorkspace } from '../../../modules/workspace/application/use-cases/RemoveUserFromWorkspace';
import { ValidationError, NotFoundError } from '../../../shared/domain/errors/AppError';

const WORKSPACE_ID = '507f1f77bcf86cd799439011';
const MEMBER_ID    = '507f1f77bcf86cd799439012';
const USER_ID      = '507f1f77bcf86cd799439013';

const mockMember = { id: MEMBER_ID, workspaceId: WORKSPACE_ID, userId: USER_ID, role: 'MEMBER' };

describe('RemoveUserFromWorkspace use case', () => {
    let mockWorkspaceMemberRepo: any;
    let useCase: RemoveUserFromWorkspace;

    beforeEach(() => {
        mockWorkspaceMemberRepo = {
            findByWorkspaceId: jest.fn().mockResolvedValue([mockMember]),
            countByRole:       jest.fn().mockResolvedValue(2), // 2 owners — safe to remove
            delete:            jest.fn().mockResolvedValue(undefined),
        };
        useCase = new RemoveUserFromWorkspace(mockWorkspaceMemberRepo);
    });

    it('should remove member successfully', async () => {
        await useCase.execute({ workspaceId: WORKSPACE_ID, memberId: MEMBER_ID, removedByUserId: USER_ID });
        expect(mockWorkspaceMemberRepo.delete).toHaveBeenCalledWith(MEMBER_ID);
    });

    it('should throw NotFoundError when member does not exist', async () => {
        mockWorkspaceMemberRepo.findByWorkspaceId.mockResolvedValue([]);
        await expect(
            useCase.execute({ workspaceId: WORKSPACE_ID, memberId: MEMBER_ID, removedByUserId: USER_ID })
        ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when removing the last owner', async () => {
        // The member being removed is an OWNER and is the only owner
        mockWorkspaceMemberRepo.findByWorkspaceId.mockResolvedValue([
            { id: MEMBER_ID, workspaceId: WORKSPACE_ID, userId: USER_ID, role: 'OWNER' },
        ]);
        mockWorkspaceMemberRepo.countByRole.mockResolvedValue(1); // only 1 owner left
        await expect(
            useCase.execute({ workspaceId: WORKSPACE_ID, memberId: MEMBER_ID, removedByUserId: USER_ID })
        ).rejects.toThrow(ValidationError);
    });
});
