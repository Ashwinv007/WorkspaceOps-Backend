import { CreateWorkItem } from '../../../modules/work-item/application/use-cases/CreateWorkItem';
import { ValidationError, NotFoundError } from '../../../shared/domain/errors/AppError';
import { EntityRole } from '../../../modules/entity/domain/entities/Entity';

const WORKSPACE_ID      = '507f1f77bcf86cd799439011';
const USER_ID           = '507f1f77bcf86cd799439012';
const ENTITY_ID         = '507f1f77bcf86cd799439013';
const WORK_ITEM_TYPE_ID = '507f1f77bcf86cd799439014';
const WORK_ITEM_ID      = '507f1f77bcf86cd799439015';

const mockType     = { id: WORK_ITEM_TYPE_ID, workspaceId: WORKSPACE_ID, name: 'Bug', entityType: null };
const mockEntity   = { id: ENTITY_ID, workspaceId: WORKSPACE_ID, name: 'Acme', role: EntityRole.CUSTOMER };
const mockWorkItem = { id: WORK_ITEM_ID, workspaceId: WORKSPACE_ID, title: 'Fix Login Bug' };

describe('CreateWorkItem use case', () => {
    let mockWorkItemRepo: any;
    let mockWorkItemTypeRepo: any;
    let mockEntityRepo: any;
    let useCase: CreateWorkItem;

    beforeEach(() => {
        mockWorkItemTypeRepo = {
            findById: jest.fn().mockResolvedValue(mockType),
        };
        mockEntityRepo = {
            findById: jest.fn().mockResolvedValue(mockEntity),
        };
        mockWorkItemRepo = {
            create: jest.fn().mockResolvedValue(mockWorkItem),
        };
        useCase = new CreateWorkItem(mockWorkItemRepo, mockWorkItemTypeRepo, mockEntityRepo);
    });

    it('should create work item successfully', async () => {
        const result = await useCase.execute({
            workspaceId: WORKSPACE_ID, assignedToUserId: USER_ID,
            workItemTypeId: WORK_ITEM_TYPE_ID, entityId: ENTITY_ID,
            title: 'Fix Login Bug',
        });

        expect(result).toBeDefined();
        expect(mockWorkItemRepo.create).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundError when work item type not found', async () => {
        mockWorkItemTypeRepo.findById.mockResolvedValue(null);
        await expect(
            useCase.execute({ workspaceId: WORKSPACE_ID, assignedToUserId: USER_ID, workItemTypeId: WORK_ITEM_TYPE_ID, entityId: ENTITY_ID, title: 'Fix Bug' })
        ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when entity not found', async () => {
        mockEntityRepo.findById.mockResolvedValue(null);
        await expect(
            useCase.execute({ workspaceId: WORKSPACE_ID, assignedToUserId: USER_ID, workItemTypeId: WORK_ITEM_TYPE_ID, entityId: ENTITY_ID, title: 'Fix Bug' })
        ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when entity role does not match type restriction', async () => {
        // Type is restricted to EMPLOYEE entities only
        mockWorkItemTypeRepo.findById.mockResolvedValue({ ...mockType, entityType: 'EMPLOYEE' });
        // But entity is a CUSTOMER
        mockEntityRepo.findById.mockResolvedValue({ ...mockEntity, role: EntityRole.CUSTOMER });

        await expect(
            useCase.execute({ workspaceId: WORKSPACE_ID, assignedToUserId: USER_ID, workItemTypeId: WORK_ITEM_TYPE_ID, entityId: ENTITY_ID, title: 'Fix Bug' })
        ).rejects.toThrow(ValidationError);
    });
});
