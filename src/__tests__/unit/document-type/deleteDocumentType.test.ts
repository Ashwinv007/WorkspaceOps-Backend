import { DeleteDocumentType } from '../../../modules/document-type/application/use-cases/DeleteDocumentType';
import { ValidationError, NotFoundError } from '../../../shared/domain/errors/AppError';

const WORKSPACE_ID     = '507f1f77bcf86cd799439011';
const DOCUMENT_TYPE_ID = '507f1f77bcf86cd799439012';
const USER_ID          = '507f1f77bcf86cd799439013';

const mockDocType = { id: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID, name: 'Invoice' };

describe('DeleteDocumentType use case', () => {
    let mockDocumentTypeRepo: any;
    let useCase: DeleteDocumentType;

    beforeEach(() => {
        mockDocumentTypeRepo = {
            findByIdWithFields: jest.fn().mockResolvedValue({ documentType: mockDocType, fields: [] }),
            delete:             jest.fn().mockResolvedValue(undefined),
        };
        useCase = new DeleteDocumentType(mockDocumentTypeRepo);
    });

    it('should delete document type successfully', async () => {
        await useCase.execute({ id: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID, userId: USER_ID });
        expect(mockDocumentTypeRepo.delete).toHaveBeenCalledWith(DOCUMENT_TYPE_ID);
    });

    it('should throw ValidationError for invalid document type id', async () => {
        await expect(
            useCase.execute({ id: 'bad-id', workspaceId: WORKSPACE_ID, userId: USER_ID })
        ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid workspaceId', async () => {
        await expect(
            useCase.execute({ id: DOCUMENT_TYPE_ID, workspaceId: 'bad-id', userId: USER_ID })
        ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when document type does not exist', async () => {
        mockDocumentTypeRepo.findByIdWithFields.mockResolvedValue(null);
        await expect(
            useCase.execute({ id: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID, userId: USER_ID })
        ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when document type belongs to different workspace', async () => {
        mockDocumentTypeRepo.findByIdWithFields.mockResolvedValue({
            documentType: { ...mockDocType, workspaceId: '999f1f77bcf86cd799439099' },
            fields: [],
        });
        await expect(
            useCase.execute({ id: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID, userId: USER_ID })
        ).rejects.toThrow(NotFoundError);
    });
});
