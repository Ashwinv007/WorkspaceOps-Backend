import { GetUserWorkspaces } from '../../../modules/workspace/application/use-cases/GetUserWorkspaces';

const USER_ID      = '507f1f77bcf86cd799439012';
const WORKSPACE_ID = '507f1f77bcf86cd799439013';

describe('GetUserWorkspaces use case', () => {
    let mockWorkspaceRepo: any;
    let mockWorkspaceMemberRepo: any;
    let useCase: GetUserWorkspaces;

    beforeEach(() => {
        mockWorkspaceMemberRepo = {
            findByUserId: jest.fn().mockResolvedValue([
                { workspaceId: WORKSPACE_ID, role: 'OWNER' },
            ]),
        };
        mockWorkspaceRepo = {
            findById: jest.fn().mockResolvedValue({ id: WORKSPACE_ID, name: 'Test Workspace' }),
        };
        useCase = new GetUserWorkspaces(mockWorkspaceRepo, mockWorkspaceMemberRepo);
    });

    it('should return workspaces with roles for the user', async () => {
        const result = await useCase.execute({ userId: USER_ID });

        expect(Array.isArray(result)).toBe(true);
        expect(result[0]).toHaveProperty('workspace');
        expect(result[0]).toHaveProperty('role');
        expect(mockWorkspaceMemberRepo.findByUserId).toHaveBeenCalledWith(USER_ID);
    });

    it('should return empty array when user has no workspaces', async () => {
        mockWorkspaceMemberRepo.findByUserId.mockResolvedValue([]);
        const result = await useCase.execute({ userId: USER_ID });
        expect(result).toEqual([]);
    });
});
