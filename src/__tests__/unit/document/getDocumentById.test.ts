import { GetDocumentById } from '../../../modules/document/application/use-cases/GetDocumentById';
import { NotFoundError } from '../../../shared/domain/errors/AppError';

const WORKSPACE_ID = '507f1f77bcf86cd799439011';
const DOCUMENT_ID  = '507f1f77bcf86cd799439012';

const mockDocument = { id: DOCUMENT_ID, workspaceId: WORKSPACE_ID, name: 'Invoice.pdf' };

describe('GetDocumentById use case', () => {
    let mockDocumentRepo: any;
    let useCase: GetDocumentById;

    beforeEach(() => {
        mockDocumentRepo = {
            findById: jest.fn().mockResolvedValue(mockDocument),
        };
        useCase = new GetDocumentById(mockDocumentRepo);
    });

    it('should return document when found', async () => {
        const result = await useCase.execute(DOCUMENT_ID, WORKSPACE_ID);
        expect(result.id).toBe(DOCUMENT_ID);
        expect(mockDocumentRepo.findById).toHaveBeenCalledWith(DOCUMENT_ID, WORKSPACE_ID);
    });

    it('should throw NotFoundError when document does not exist', async () => {
        mockDocumentRepo.findById.mockResolvedValue(null);
        await expect(useCase.execute(DOCUMENT_ID, WORKSPACE_ID)).rejects.toThrow(NotFoundError);
    });
});
