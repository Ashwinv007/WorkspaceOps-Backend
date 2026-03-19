import { CreateWorkItemType } from '../../../modules/work-item/application/use-cases/CreateWorkItemType';
import { ValidationError } from '../../../shared/domain/errors/AppError';

const WORKSPACE_ID       = '507f1f77bcf86cd799439011';
const USER_ID            = '507f1f77bcf86cd799439012';
const WORK_ITEM_TYPE_ID  = '507f1f77bcf86cd799439013';

describe('CreateWorkItemType use case', () => {
    let mockWorkItemTypeRepo: any;
    let useCase: CreateWorkItemType;

    beforeEach(() => {
        mockWorkItemTypeRepo = {
            findByName: jest.fn().mockResolvedValue(null), // default: no duplicate
            create:     jest.fn().mockResolvedValue({ id: WORK_ITEM_TYPE_ID, workspaceId: WORKSPACE_ID, name: 'Bug' }),
        };
        useCase = new CreateWorkItemType(mockWorkItemTypeRepo);
    });

    it('should create work item type successfully', async () => {
        const result = await useCase.execute({ workspaceId: WORKSPACE_ID, userId: USER_ID, name: 'Bug' });
        expect(result).toBeDefined();
        expect(result.name).toBe('Bug');
        expect(mockWorkItemTypeRepo.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ValidationError when type name already exists in workspace', async () => {
        mockWorkItemTypeRepo.findByName.mockResolvedValue({ id: WORK_ITEM_TYPE_ID, name: 'Bug' });
        await expect(
            useCase.execute({ workspaceId: WORKSPACE_ID, userId: USER_ID, name: 'Bug' })
        ).rejects.toThrow(ValidationError);
    });
});
