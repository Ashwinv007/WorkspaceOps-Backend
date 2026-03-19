import { GetDocumentTypes } from '../../../modules/document-type/application/use-cases/GetDocumentTypes';
import { ValidationError } from '../../../shared/domain/errors/AppError';

const WORKSPACE_ID     = '507f1f77bcf86cd799439011';
const DOCUMENT_TYPE_ID = '507f1f77bcf86cd799439012';

describe('GetDocumentTypes use case', () => {
    let mockDocumentTypeRepo: any;
    let useCase: GetDocumentTypes;

    beforeEach(() => {
        mockDocumentTypeRepo = {
            findByWorkspaceId: jest.fn().mockResolvedValue([
                { id: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID, name: 'Invoice' },
            ]),
            getFields: jest.fn().mockResolvedValue([]),
        };
        useCase = new GetDocumentTypes(mockDocumentTypeRepo);
    });

    it('should return all document types with their fields', async () => {
        const result = await useCase.execute({ workspaceId: WORKSPACE_ID });

        expect(Array.isArray(result)).toBe(true);
        expect(result[0]).toHaveProperty('documentType');
        expect(result[0]).toHaveProperty('fields');
        // getFields is called once per document type (via Promise.all)
        expect(mockDocumentTypeRepo.getFields).toHaveBeenCalledTimes(1);
    });

    it('should throw ValidationError for invalid workspaceId', async () => {
        await expect(
            useCase.execute({ workspaceId: 'bad-id' })
        ).rejects.toThrow(ValidationError);
    });
});
