import { GetWorkspaceMembers } from '../../../modules/workspace/application/use-cases/GetWorkspaceMembers';
import { ValidationError, NotFoundError } from '../../../shared/domain/errors/AppError';

const WORKSPACE_ID = '507f1f77bcf86cd799439011';
const USER_ID      = '507f1f77bcf86cd799439012';

describe('GetWorkspaceMembers use case', () => {
    let mockWorkspaceRepo: any;
    let mockWorkspaceMemberRepo: any;
    let useCase: GetWorkspaceMembers;

    beforeEach(() => {
        mockWorkspaceRepo = {
            findById: jest.fn().mockResolvedValue({ id: WORKSPACE_ID, name: 'Test Workspace' }),
        };
        mockWorkspaceMemberRepo = {
            findByWorkspaceId: jest.fn().mockResolvedValue([
                { id: '507f1f77bcf86cd799439013', workspaceId: WORKSPACE_ID, userId: USER_ID, role: 'OWNER' },
            ]),
        };
        useCase = new GetWorkspaceMembers(mockWorkspaceRepo, mockWorkspaceMemberRepo);
    });

    it('should return members for the workspace', async () => {
        const result = await useCase.execute({ workspaceId: WORKSPACE_ID, requestingUserId: USER_ID });

        expect(Array.isArray(result)).toBe(true);
        expect(mockWorkspaceMemberRepo.findByWorkspaceId).toHaveBeenCalledWith(WORKSPACE_ID);
    });

    it('should throw ValidationError for invalid workspaceId', async () => {
        await expect(
            useCase.execute({ workspaceId: 'bad-id', requestingUserId: USER_ID })
        ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when workspace does not exist', async () => {
        mockWorkspaceRepo.findById.mockResolvedValue(null);
        await expect(
            useCase.execute({ workspaceId: WORKSPACE_ID, requestingUserId: USER_ID })
        ).rejects.toThrow(NotFoundError);
    });
});
