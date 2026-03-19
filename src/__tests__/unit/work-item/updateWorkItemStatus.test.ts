import { UpdateWorkItemStatus } from '../../../modules/work-item/application/use-cases/UpdateWorkItemStatus';
import { ValidationError, NotFoundError, ConflictError } from '../../../shared/domain/errors/AppError';
import { WorkItemStatus } from '../../../modules/work-item/domain/enums/WorkItemStatus';

const WORKSPACE_ID = '507f1f77bcf86cd799439011';
const WORK_ITEM_ID = '507f1f77bcf86cd799439012';

describe('UpdateWorkItemStatus use case', () => {
    let mockWorkItemRepo: any;
    let mockWorkItem: any;
    let useCase: UpdateWorkItemStatus;

    beforeEach(() => {
        // WorkItem is a domain entity with a canTransitionTo() method.
        // The mock must include it — plain objects won't have it.
        mockWorkItem = {
            id: WORK_ITEM_ID, workspaceId: WORKSPACE_ID, title: 'Fix Bug', status: WorkItemStatus.DRAFT,
            canTransitionTo: jest.fn().mockReturnValue(true),
        };
        mockWorkItemRepo = {
            findById:     jest.fn().mockResolvedValue(mockWorkItem),
            updateStatus: jest.fn().mockResolvedValue({ ...mockWorkItem, status: WorkItemStatus.ACTIVE }),
        };
        useCase = new UpdateWorkItemStatus(mockWorkItemRepo);
    });

    it('should transition DRAFT → ACTIVE successfully', async () => {
        const result = await useCase.execute(WORK_ITEM_ID, WORKSPACE_ID, WorkItemStatus.ACTIVE);
        expect(result.status).toBe(WorkItemStatus.ACTIVE);
        expect(mockWorkItemRepo.updateStatus).toHaveBeenCalledTimes(1);
    });

    it('should throw ValidationError for invalid status value', async () => {
        await expect(
            useCase.execute(WORK_ITEM_ID, WORKSPACE_ID, 'INVALID' as WorkItemStatus)
        ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when work item does not exist', async () => {
        mockWorkItemRepo.findById.mockResolvedValue(null);
        await expect(
            useCase.execute(WORK_ITEM_ID, WORKSPACE_ID, WorkItemStatus.ACTIVE)
        ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when transitioning to same status', async () => {
        // Item is already DRAFT — trying to set it to DRAFT again
        await expect(
            useCase.execute(WORK_ITEM_ID, WORKSPACE_ID, WorkItemStatus.DRAFT)
        ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid transition DRAFT → COMPLETED', async () => {
        // canTransitionTo returns false for DRAFT → COMPLETED (blocked transition)
        mockWorkItem.canTransitionTo.mockReturnValue(false);
        await expect(
            useCase.execute(WORK_ITEM_ID, WORKSPACE_ID, WorkItemStatus.COMPLETED)
        ).rejects.toThrow(ValidationError);
    });

    it('should throw ConflictError on concurrent status update', async () => {
        // updateStatus returns null when another request changed the status concurrently
        // (optimistic locking — the currentStatus we sent no longer matches)
        mockWorkItemRepo.updateStatus.mockResolvedValue(null);
        await expect(
            useCase.execute(WORK_ITEM_ID, WORKSPACE_ID, WorkItemStatus.ACTIVE)
        ).rejects.toThrow(ConflictError);
    });
});
