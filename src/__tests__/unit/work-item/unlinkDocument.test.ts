import { UnlinkDocument } from '../../../modules/work-item/application/use-cases/UnlinkDocument';
import { NotFoundError } from '../../../shared/domain/errors/AppError';

const WORKSPACE_ID = '507f1f77bcf86cd799439011';
const WORK_ITEM_ID = '507f1f77bcf86cd799439012';
const DOCUMENT_ID  = '507f1f77bcf86cd799439013';

const mockWorkItem = { id: WORK_ITEM_ID, workspaceId: WORKSPACE_ID, title: 'Fix Bug' };

describe('UnlinkDocument use case', () => {
    let mockWorkItemRepo: any;
    let mockWorkItemDocumentRepo: any;
    let useCase: UnlinkDocument;

    beforeEach(() => {
        mockWorkItemRepo = {
            findById: jest.fn().mockResolvedValue(mockWorkItem),
        };
        mockWorkItemDocumentRepo = {
            unlink: jest.fn().mockResolvedValue(true),
        };
        useCase = new UnlinkDocument(mockWorkItemRepo, mockWorkItemDocumentRepo);
    });

    it('should unlink document successfully', async () => {
        await useCase.execute(WORK_ITEM_ID, WORKSPACE_ID, DOCUMENT_ID);
        expect(mockWorkItemDocumentRepo.unlink).toHaveBeenCalledWith(WORK_ITEM_ID, DOCUMENT_ID);
    });

    it('should throw NotFoundError when work item does not exist', async () => {
        mockWorkItemRepo.findById.mockResolvedValue(null);
        await expect(
            useCase.execute(WORK_ITEM_ID, WORKSPACE_ID, DOCUMENT_ID)
        ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when document link does not exist', async () => {
        mockWorkItemDocumentRepo.unlink.mockResolvedValue(false);
        await expect(
            useCase.execute(WORK_ITEM_ID, WORKSPACE_ID, DOCUMENT_ID)
        ).rejects.toThrow(NotFoundError);
    });
});
