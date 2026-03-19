import { DeleteDocument } from '../../../modules/document/application/use-cases/DeleteDocument';
import { NotFoundError } from '../../../shared/domain/errors/AppError';

const WORKSPACE_ID = '507f1f77bcf86cd799439011';
const DOCUMENT_ID  = '507f1f77bcf86cd799439012';

describe('DeleteDocument use case', () => {
    let mockDocumentRepo: any;
    let useCase: DeleteDocument;

    beforeEach(() => {
        mockDocumentRepo = {
            delete: jest.fn().mockResolvedValue({ id: DOCUMENT_ID }),
        };
        useCase = new DeleteDocument(mockDocumentRepo);
    });

    it('should delete document successfully', async () => {
        await useCase.execute(DOCUMENT_ID, WORKSPACE_ID);
        expect(mockDocumentRepo.delete).toHaveBeenCalledWith(DOCUMENT_ID, WORKSPACE_ID);
    });

    it('should throw NotFoundError when document does not exist', async () => {
        mockDocumentRepo.delete.mockResolvedValue(null);
        await expect(useCase.execute(DOCUMENT_ID, WORKSPACE_ID)).rejects.toThrow(NotFoundError);
    });
});
