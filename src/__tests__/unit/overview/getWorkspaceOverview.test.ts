import { GetWorkspaceOverview } from '../../../modules/overview/application/use-cases/GetWorkspaceOverview';

const WORKSPACE_ID = '507f1f77bcf86cd799439011';
const USER_ID      = '507f1f77bcf86cd799439012';

describe('GetWorkspaceOverview use case', () => {
    let mockEntityRepo: any;
    let mockDocumentRepo: any;
    let mockDocumentTypeRepo: any;
    let mockWorkItemRepo: any;
    let mockWorkItemTypeRepo: any;
    let useCase: GetWorkspaceOverview;

    beforeEach(() => {
        mockEntityRepo = {
            countByWorkspace:    jest.fn().mockResolvedValue(5),
            countByRoleGrouped:  jest.fn().mockResolvedValue({ CUSTOMER: 3, EMPLOYEE: 1, VENDOR: 1, SELF: 0 }),
        };
        mockDocumentRepo = {
            countByWorkspace:        jest.fn().mockResolvedValue(10),
            countExpiringDocuments:  jest.fn().mockResolvedValue(2),
            countExpiredDocuments:   jest.fn().mockResolvedValue(1),
        };
        mockDocumentTypeRepo = {
            findByWorkspaceId: jest.fn().mockResolvedValue([]),
            getFields:         jest.fn().mockResolvedValue([]),
        };
        mockWorkItemRepo = {
            countByStatusGrouped: jest.fn().mockResolvedValue({ DRAFT: 3, ACTIVE: 2, COMPLETED: 1 }),
        };
        mockWorkItemTypeRepo = {
            findByWorkspace: jest.fn().mockResolvedValue([]),
        };

        useCase = new GetWorkspaceOverview(
            mockEntityRepo,
            mockDocumentRepo,
            mockDocumentTypeRepo,
            mockWorkItemRepo,
            mockWorkItemTypeRepo
        );
    });

    it('should return a complete workspace overview', async () => {
        const result = await useCase.execute({ workspaceId: WORKSPACE_ID, userId: USER_ID });

        expect(result).toHaveProperty('workspaceId', WORKSPACE_ID);
        expect(result).toHaveProperty('entities');
        expect(result).toHaveProperty('documents');
        expect(result).toHaveProperty('workItems');
        expect(result).toHaveProperty('documentTypes');
        expect(result).toHaveProperty('workItemTypes');
    });
});
