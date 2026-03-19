import { GetWorkItemTypes } from '../../../modules/work-item/application/use-cases/GetWorkItemTypes';

const WORKSPACE_ID = '507f1f77bcf86cd799439011';

describe('GetWorkItemTypes use case', () => {
    let mockWorkItemTypeRepo: any;
    let useCase: GetWorkItemTypes;

    beforeEach(() => {
        mockWorkItemTypeRepo = {
            findByWorkspace: jest.fn().mockResolvedValue([
                { id: '507f1f77bcf86cd799439012', workspaceId: WORKSPACE_ID, name: 'Bug' },
            ]),
        };
        useCase = new GetWorkItemTypes(mockWorkItemTypeRepo);
    });

    it('should return work item types for workspace', async () => {
        const result = await useCase.execute(WORKSPACE_ID);
        expect(Array.isArray(result)).toBe(true);
        expect(mockWorkItemTypeRepo.findByWorkspace).toHaveBeenCalledWith(WORKSPACE_ID);
    });
});
