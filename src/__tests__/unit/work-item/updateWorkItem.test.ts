import { UpdateWorkItem } from '../../../modules/work-item/application/use-cases/UpdateWorkItem';
import { ValidationError, NotFoundError } from '../../../shared/domain/errors/AppError';

const WORKSPACE_ID  = '507f1f77bcf86cd799439011';
const USER_ID       = '507f1f77bcf86cd799439012';
const ENTITY_ID     = '507f1f77bcf86cd799439013';
const NEW_ENTITY_ID = '507f1f77bcf86cd799439099'; // different entity for reassignment tests
const WORK_ITEM_ID  = '507f1f77bcf86cd799439014';

const mockWorkItem = { id: WORK_ITEM_ID, workspaceId: WORKSPACE_ID, title: 'Fix Bug', entityId: ENTITY_ID };
const mockEntity   = { id: ENTITY_ID, workspaceId: WORKSPACE_ID, name: 'Acme' };

describe('UpdateWorkItem use case', () => {
    let mockWorkItemRepo: any;
    let mockEntityRepo: any;
    let useCase: UpdateWorkItem;

    beforeEach(() => {
        mockWorkItemRepo = {
            findById: jest.fn().mockResolvedValue(mockWorkItem),
            update:   jest.fn().mockResolvedValue({ ...mockWorkItem, title: 'Fix Login Bug' }),
        };
        mockEntityRepo = {
            findById: jest.fn().mockResolvedValue(mockEntity),
        };
        useCase = new UpdateWorkItem(mockWorkItemRepo, mockEntityRepo);
    });

    // execute(id, workspaceId, dto, userId?)
    it('should update work item title successfully', async () => {
        const result = await useCase.execute(WORK_ITEM_ID, WORKSPACE_ID, { title: 'Fix Login Bug' }, USER_ID);
        expect(result).toBeDefined();
        expect(mockWorkItemRepo.update).toHaveBeenCalledTimes(1);
    });

    it('should throw ValidationError when no fields provided', async () => {
        await expect(
            useCase.execute(WORK_ITEM_ID, WORKSPACE_ID, {}, USER_ID)
        ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when work item does not exist', async () => {
        mockWorkItemRepo.findById.mockResolvedValue(null);
        await expect(
            useCase.execute(WORK_ITEM_ID, WORKSPACE_ID, { title: 'New Title' }, USER_ID)
        ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for empty title', async () => {
        await expect(
            useCase.execute(WORK_ITEM_ID, WORKSPACE_ID, { title: '' }, USER_ID)
        ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for title exceeding 255 characters', async () => {
        await expect(
            useCase.execute(WORK_ITEM_ID, WORKSPACE_ID, { title: 'A'.repeat(256) }, USER_ID)
        ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when new entity does not exist', async () => {
        // Must use a DIFFERENT entityId than the current item's entityId,
        // otherwise the use case skips the lookup (dto.entityId !== item.entityId check)
        mockEntityRepo.findById.mockResolvedValue(null);
        await expect(
            useCase.execute(WORK_ITEM_ID, WORKSPACE_ID, { entityId: NEW_ENTITY_ID }, USER_ID)
        ).rejects.toThrow(NotFoundError);
    });
});
