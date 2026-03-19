import { CreateWorkspace } from '../../../modules/workspace/application/use-cases/CreateWorkspace';
import { ValidationError, NotFoundError } from '../../../shared/domain/errors/AppError';

const TENANT_ID    = '507f1f77bcf86cd799439011';
const USER_ID      = '507f1f77bcf86cd799439012';
const WORKSPACE_ID = '507f1f77bcf86cd799439013';

const mockWorkspace = { id: WORKSPACE_ID, tenantId: TENANT_ID, name: 'Test Workspace' };
const mockMembership = { id: '507f1f77bcf86cd799439014', workspaceId: WORKSPACE_ID, userId: USER_ID, role: 'OWNER' };

describe('CreateWorkspace use case', () => {
    let mockTenantRepo: any;
    let mockWorkspaceRepo: any;
    let mockWorkspaceMemberRepo: any;
    let useCase: CreateWorkspace;

    beforeEach(() => {
        mockTenantRepo = {
            findById: jest.fn().mockResolvedValue({ id: TENANT_ID, name: 'Test Tenant' }),
        };
        mockWorkspaceRepo = {
            create: jest.fn().mockResolvedValue(mockWorkspace),
        };
        mockWorkspaceMemberRepo = {
            create: jest.fn().mockResolvedValue(mockMembership),
        };
        useCase = new CreateWorkspace(mockTenantRepo, mockWorkspaceRepo, mockWorkspaceMemberRepo);
    });

    it('should create workspace and membership', async () => {
        const result = await useCase.execute({ tenantId: TENANT_ID, name: 'Test Workspace', createdByUserId: USER_ID });

        expect(result).toHaveProperty('workspace');
        expect(result).toHaveProperty('membership');
        expect(mockWorkspaceRepo.create).toHaveBeenCalledTimes(1);
        expect(mockWorkspaceMemberRepo.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ValidationError for invalid tenantId format', async () => {
        await expect(
            useCase.execute({ tenantId: 'bad-id', name: 'Test', createdByUserId: USER_ID })
        ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when tenant does not exist', async () => {
        mockTenantRepo.findById.mockResolvedValue(null);
        await expect(
            useCase.execute({ tenantId: TENANT_ID, name: 'Test', createdByUserId: USER_ID })
        ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for empty workspace name', async () => {
        await expect(
            useCase.execute({ tenantId: TENANT_ID, name: '  ', createdByUserId: USER_ID })
        ).rejects.toThrow(ValidationError);
    });
});
