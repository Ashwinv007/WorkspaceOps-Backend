import { GetWorkItems } from '../../../modules/work-item/application/use-cases/GetWorkItems';

const WORKSPACE_ID = '507f1f77bcf86cd799439011';

describe('GetWorkItems use case', () => {
    let mockWorkItemRepo: any;
    let useCase: GetWorkItems;

    beforeEach(() => {
        mockWorkItemRepo = {
            findByWorkspace: jest.fn().mockResolvedValue([
                { id: '507f1f77bcf86cd799439012', workspaceId: WORKSPACE_ID, title: 'Fix Bug' },
            ]),
        };
        useCase = new GetWorkItems(mockWorkItemRepo);
    });

    it('should return work items for workspace', async () => {
        const result = await useCase.execute(WORKSPACE_ID, {});
        expect(Array.isArray(result)).toBe(true);
        expect(mockWorkItemRepo.findByWorkspace).toHaveBeenCalledTimes(1);
    });
});
