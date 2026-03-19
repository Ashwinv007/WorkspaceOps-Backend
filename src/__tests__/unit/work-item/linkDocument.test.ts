import { LinkDocument } from '../../../modules/work-item/application/use-cases/LinkDocument';
import { ValidationError, NotFoundError } from '../../../shared/domain/errors/AppError';

const WORKSPACE_ID = '507f1f77bcf86cd799439011';
const WORK_ITEM_ID = '507f1f77bcf86cd799439012';
const DOCUMENT_ID  = '507f1f77bcf86cd799439013';

const mockWorkItem = { id: WORK_ITEM_ID, workspaceId: WORKSPACE_ID, title: 'Fix Bug' };
const mockDocument = { id: DOCUMENT_ID, workspaceId: WORKSPACE_ID, name: 'Invoice.pdf' };
const mockLink     = { workItemId: WORK_ITEM_ID, documentId: DOCUMENT_ID, linkedAt: new Date() };

describe('LinkDocument use case', () => {
    let mockWorkItemRepo: any;
    let mockWorkItemDocumentRepo: any;
    let mockDocumentRepo: any;
    let useCase: LinkDocument;

    beforeEach(() => {
        mockWorkItemRepo = {
            findById: jest.fn().mockResolvedValue(mockWorkItem),
        };
        mockDocumentRepo = {
            findById: jest.fn().mockResolvedValue(mockDocument),
        };
        mockWorkItemDocumentRepo = {
            link: jest.fn().mockResolvedValue(mockLink),
        };
        useCase = new LinkDocument(mockWorkItemRepo, mockWorkItemDocumentRepo, mockDocumentRepo);
    });

    it('should link document to work item successfully', async () => {
        const result = await useCase.execute(WORK_ITEM_ID, WORKSPACE_ID, DOCUMENT_ID);
        expect(result).toBeDefined();
        expect(mockWorkItemDocumentRepo.link).toHaveBeenCalledWith(WORK_ITEM_ID, DOCUMENT_ID);
    });

    it('should throw NotFoundError when work item does not exist', async () => {
        mockWorkItemRepo.findById.mockResolvedValue(null);
        await expect(
            useCase.execute(WORK_ITEM_ID, WORKSPACE_ID, DOCUMENT_ID)
        ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when document not found in workspace', async () => {
        mockDocumentRepo.findById.mockResolvedValue(null);
        await expect(
            useCase.execute(WORK_ITEM_ID, WORKSPACE_ID, DOCUMENT_ID)
        ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when document is already linked (duplicate)', async () => {
        // Same as InviteUserToWorkspace: MongoDB throws code 11000 for duplicate links.
        // The repo mock must THROW (not return) — use mockRejectedValue.
        // FILL IN THIS LINE:
        // The real repo catches MongoDB duplicate key (11000) and re-throws as ValidationError.
        // We simulate that final outcome here.
        mockWorkItemDocumentRepo.link.mockRejectedValue(new ValidationError('Document is already linked to this work item'));

        await expect(
            useCase.execute(WORK_ITEM_ID, WORKSPACE_ID, DOCUMENT_ID)
        ).rejects.toThrow(ValidationError);
    });
});
