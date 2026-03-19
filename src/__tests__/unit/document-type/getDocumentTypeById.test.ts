import { GetDocumentTypeById } from '../../../modules/document-type/application/use-cases/GetDocumentTypeById';
import { ValidationError, NotFoundError } from '../../../shared/domain/errors/AppError';

const WORKSPACE_ID       = '507f1f77bcf86cd799439011';
const DOCUMENT_TYPE_ID   = '507f1f77bcf86cd799439012';

const mockDocType = { id: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID, name: 'Invoice' };

describe('GetDocumentTypeById use case', () => {
    let mockDocumentTypeRepo: any;
    let useCase: GetDocumentTypeById;

    beforeEach(() => {
        mockDocumentTypeRepo = {
            findByIdWithFields: jest.fn().mockResolvedValue({ documentType: mockDocType, fields: [] }),
        };
        useCase = new GetDocumentTypeById(mockDocumentTypeRepo);
    });

    it('should return document type with fields', async () => {
        const result = await useCase.execute({ id: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID });

        expect(result).toHaveProperty('documentType');
        expect(result).toHaveProperty('fields');
        expect(mockDocumentTypeRepo.findByIdWithFields).toHaveBeenCalledWith(DOCUMENT_TYPE_ID);
    });

    it('should throw ValidationError for invalid document type id', async () => {
        await expect(
            useCase.execute({ id: 'bad-id', workspaceId: WORKSPACE_ID })
        ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid workspaceId', async () => {
        await expect(
            useCase.execute({ id: DOCUMENT_TYPE_ID, workspaceId: 'bad-id' })
        ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when document type does not exist', async () => {
        mockDocumentTypeRepo.findByIdWithFields.mockResolvedValue(null);
        await expect(
            useCase.execute({ id: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID })
        ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when document type belongs to different workspace', async () => {
        mockDocumentTypeRepo.findByIdWithFields.mockResolvedValue({
            documentType: { ...mockDocType, workspaceId: '999f1f77bcf86cd799439099' },
            fields: [],
        });
        await expect(
            useCase.execute({ id: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID })
        ).rejects.toThrow(NotFoundError);
    });
});
