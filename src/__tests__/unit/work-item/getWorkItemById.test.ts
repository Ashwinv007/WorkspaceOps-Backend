import { GetWorkItemById } from '../../../modules/work-item/application/use-cases/GetWorkItemById';
import { NotFoundError } from '../../../shared/domain/errors/AppError';

const WORKSPACE_ID  = '507f1f77bcf86cd799439011';
const WORK_ITEM_ID  = '507f1f77bcf86cd799439012';

const mockWorkItem = { id: WORK_ITEM_ID, workspaceId: WORKSPACE_ID, title: 'Fix Bug' };

describe('GetWorkItemById use case', () => {
    let mockWorkItemRepo: any;
    let useCase: GetWorkItemById;

    beforeEach(() => {
        mockWorkItemRepo = {
            findById: jest.fn().mockResolvedValue(mockWorkItem),
        };
        useCase = new GetWorkItemById(mockWorkItemRepo);
    });

    it('should return work item when found', async () => {
        const result = await useCase.execute(WORK_ITEM_ID, WORKSPACE_ID);
        expect(result.id).toBe(WORK_ITEM_ID);
        expect(mockWorkItemRepo.findById).toHaveBeenCalledWith(WORK_ITEM_ID, WORKSPACE_ID);
    });

    it('should throw NotFoundError when work item does not exist', async () => {
        mockWorkItemRepo.findById.mockResolvedValue(null);
        await expect(useCase.execute(WORK_ITEM_ID, WORKSPACE_ID)).rejects.toThrow(NotFoundError);
    });
});
