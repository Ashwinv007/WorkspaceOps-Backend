import { DeleteWorkItem } from '../../../modules/work-item/application/use-cases/DeleteWorkItem';
import { NotFoundError } from '../../../shared/domain/errors/AppError';

const WORKSPACE_ID = '507f1f77bcf86cd799439011';
const WORK_ITEM_ID = '507f1f77bcf86cd799439012';

const mockWorkItem = { id: WORK_ITEM_ID, workspaceId: WORKSPACE_ID, title: 'Fix Bug' };

describe('DeleteWorkItem use case', () => {
    let mockWorkItemRepo: any;
    let mockWorkItemDocumentRepo: any;
    let useCase: DeleteWorkItem;

    beforeEach(() => {
        mockWorkItemRepo = {
            findById: jest.fn().mockResolvedValue(mockWorkItem),
            delete:   jest.fn().mockResolvedValue(undefined),
        };
        mockWorkItemDocumentRepo = {
            deleteByWorkItem: jest.fn().mockResolvedValue(undefined),
        };
        useCase = new DeleteWorkItem(mockWorkItemRepo, mockWorkItemDocumentRepo);
    });

    it('should delete work item and its document links', async () => {
        await useCase.execute(WORK_ITEM_ID, WORKSPACE_ID);
        expect(mockWorkItemDocumentRepo.deleteByWorkItem).toHaveBeenCalledWith(WORK_ITEM_ID);
        expect(mockWorkItemRepo.delete).toHaveBeenCalledWith(WORK_ITEM_ID, WORKSPACE_ID);
    });

    it('should throw NotFoundError when work item does not exist', async () => {
        mockWorkItemRepo.findById.mockResolvedValue(null);
        await expect(useCase.execute(WORK_ITEM_ID, WORKSPACE_ID)).rejects.toThrow(NotFoundError);
    });
});
