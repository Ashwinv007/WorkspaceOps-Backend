import { GetWorkItemsByEntity } from '../../../modules/work-item/application/use-cases/GetWorkItemsByEntity';

const WORKSPACE_ID = '507f1f77bcf86cd799439011';
const ENTITY_ID    = '507f1f77bcf86cd799439012';

describe('GetWorkItemsByEntity use case', () => {
    let mockWorkItemRepo: any;
    let useCase: GetWorkItemsByEntity;

    beforeEach(() => {
        mockWorkItemRepo = {
            findByEntity: jest.fn().mockResolvedValue([
                { id: '507f1f77bcf86cd799439013', workspaceId: WORKSPACE_ID, entityId: ENTITY_ID },
            ]),
        };
        useCase = new GetWorkItemsByEntity(mockWorkItemRepo);
    });

    it('should return work items for the given entity', async () => {
        const result = await useCase.execute(ENTITY_ID, WORKSPACE_ID);
        expect(Array.isArray(result)).toBe(true);
        expect(mockWorkItemRepo.findByEntity).toHaveBeenCalledWith(ENTITY_ID, WORKSPACE_ID);
    });
});
