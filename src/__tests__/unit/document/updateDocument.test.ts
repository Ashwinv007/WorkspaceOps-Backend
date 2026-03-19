import { UpdateDocument } from '../../../modules/document/application/use-cases/UpdateDocument';
import { ValidationError, NotFoundError } from '../../../shared/domain/errors/AppError';

const WORKSPACE_ID = '507f1f77bcf86cd799439011';
const DOCUMENT_ID  = '507f1f77bcf86cd799439012';

// UpdateDocumentDTO fields: entityId?, metadata?, expiryDate?  (no "name" field)
const mockDocument = { id: DOCUMENT_ID, workspaceId: WORKSPACE_ID };

describe('UpdateDocument use case', () => {
    let mockDocumentRepo: any;
    let useCase: UpdateDocument;

    beforeEach(() => {
        mockDocumentRepo = {
            update: jest.fn().mockResolvedValue(mockDocument),
        };
        useCase = new UpdateDocument(mockDocumentRepo);
    });

    it('should update document metadata successfully', async () => {
        const result = await useCase.execute(DOCUMENT_ID, WORKSPACE_ID, { metadata: { note: 'updated' } });
        expect(result).toBeDefined();
        expect(mockDocumentRepo.update).toHaveBeenCalledTimes(1);
    });

    it('should throw ValidationError when no fields provided for update', async () => {
        await expect(
            useCase.execute(DOCUMENT_ID, WORKSPACE_ID, {})
        ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when document does not exist', async () => {
        mockDocumentRepo.update.mockResolvedValue(null);
        await expect(
            useCase.execute(DOCUMENT_ID, WORKSPACE_ID, { metadata: { note: 'updated' } })
        ).rejects.toThrow(NotFoundError);
    });
});
