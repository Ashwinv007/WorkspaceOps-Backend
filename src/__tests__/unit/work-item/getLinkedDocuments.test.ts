import { GetLinkedDocuments } from '../../../modules/work-item/application/use-cases/GetLinkedDocuments';

const WORKSPACE_ID = '507f1f77bcf86cd799439011';
const WORK_ITEM_ID = '507f1f77bcf86cd799439012';
const DOCUMENT_ID  = '507f1f77bcf86cd799439013';

describe('GetLinkedDocuments use case', () => {
    let mockWorkItemDocumentRepo: any;
    let mockDocumentRepo: any;
    let useCase: GetLinkedDocuments;

    beforeEach(() => {
        mockWorkItemDocumentRepo = {
            findByWorkItem: jest.fn().mockResolvedValue([
                { workItemId: WORK_ITEM_ID, documentId: DOCUMENT_ID, linkedAt: new Date() },
            ]),
        };
        mockDocumentRepo = {
            findById: jest.fn().mockResolvedValue({
                id: DOCUMENT_ID, workspaceId: WORKSPACE_ID, name: 'Invoice.pdf',
            }),
        };
        useCase = new GetLinkedDocuments(mockWorkItemDocumentRepo, mockDocumentRepo);
    });

    it('should return linked documents for the work item', async () => {
        const result = await useCase.execute(WORK_ITEM_ID, WORKSPACE_ID);

        expect(Array.isArray(result)).toBe(true);
        expect(mockWorkItemDocumentRepo.findByWorkItem).toHaveBeenCalledWith(WORK_ITEM_ID);
        // findById is called once per linked document (via Promise.all)
        expect(mockDocumentRepo.findById).toHaveBeenCalledTimes(1);
    });
});
