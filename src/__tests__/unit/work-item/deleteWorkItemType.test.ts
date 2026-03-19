import { DeleteWorkItemType } from '../../../modules/work-item/application/use-cases/DeleteWorkItemType';
import { ValidationError, NotFoundError } from '../../../shared/domain/errors/AppError';

const WORKSPACE_ID      = '507f1f77bcf86cd799439011';
const USER_ID           = '507f1f77bcf86cd799439012';
const WORK_ITEM_TYPE_ID = '507f1f77bcf86cd799439013';

const mockType = { id: WORK_ITEM_TYPE_ID, workspaceId: WORKSPACE_ID, name: 'Bug' };

describe('DeleteWorkItemType use case', () => {
    let mockWorkItemTypeRepo: any;
    let mockWorkItemRepo: any;
    let useCase: DeleteWorkItemType;

    beforeEach(() => {
        mockWorkItemTypeRepo = {
            findById: jest.fn().mockResolvedValue(mockType),
            delete:   jest.fn().mockResolvedValue(undefined),
        };
        mockWorkItemRepo = {
            findByWorkspace: jest.fn().mockResolvedValue([]), // default: no work items reference this type
        };
        useCase = new DeleteWorkItemType(mockWorkItemTypeRepo, mockWorkItemRepo);
    });

    it('should delete work item type successfully', async () => {
        await useCase.execute(WORK_ITEM_TYPE_ID, WORKSPACE_ID, USER_ID);
        expect(mockWorkItemTypeRepo.delete).toHaveBeenCalledWith(WORK_ITEM_TYPE_ID, WORKSPACE_ID);
    });

    it('should throw NotFoundError when type does not exist', async () => {
        mockWorkItemTypeRepo.findById.mockResolvedValue(null);
        await expect(
            useCase.execute(WORK_ITEM_TYPE_ID, WORKSPACE_ID, USER_ID)
        ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when work items still reference this type', async () => {
        mockWorkItemRepo.findByWorkspace.mockResolvedValue([
            { id: '507f1f77bcf86cd799439014', workItemTypeId: WORK_ITEM_TYPE_ID },
        ]);
        await expect(
            useCase.execute(WORK_ITEM_TYPE_ID, WORKSPACE_ID, USER_ID)
        ).rejects.toThrow(ValidationError);
    });
});
