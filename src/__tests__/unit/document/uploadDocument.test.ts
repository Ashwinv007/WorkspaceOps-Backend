import { UploadDocument } from '../../../modules/document/application/use-cases/UploadDocument';
import { ValidationError, NotFoundError } from '../../../shared/domain/errors/AppError';

const WORKSPACE_ID     = '507f1f77bcf86cd799439011';
const USER_ID          = '507f1f77bcf86cd799439012';
const ENTITY_ID        = '507f1f77bcf86cd799439013';
const DOCUMENT_TYPE_ID = '507f1f77bcf86cd799439014';
const DOCUMENT_ID      = '507f1f77bcf86cd799439015';

const mockDocType  = { id: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID, name: 'Invoice', hasMetadata: false };
const mockEntity   = { id: ENTITY_ID, workspaceId: WORKSPACE_ID, name: 'Acme' };
const mockDocument = { id: DOCUMENT_ID, workspaceId: WORKSPACE_ID, name: 'Invoice.pdf' };

// UploadDocumentDTO uses: workspaceId, documentTypeId, entityId?, file (Multer), metadata?, expiryDate?, uploadedBy
// execute(dto, fileUrl) — fileUrl is the stored file URL (from storage service)
const baseDTO = {
    workspaceId: WORKSPACE_ID,
    documentTypeId: DOCUMENT_TYPE_ID,
    entityId: ENTITY_ID,
    uploadedBy: USER_ID,
    file: { originalname: 'Invoice.pdf', size: 1024, mimetype: 'application/pdf' } as any,
    metadata: {},
};
const FILE_URL = 'https://storage.test.com/invoice.pdf';

describe('UploadDocument use case', () => {
    let mockDocumentRepo: any;
    let mockDocumentTypeRepo: any;
    let mockEntityRepo: any;
    let useCase: UploadDocument;

    beforeEach(() => {
        mockDocumentTypeRepo = {
            findById: jest.fn().mockResolvedValue(mockDocType),
        };
        mockEntityRepo = {
            findById: jest.fn().mockResolvedValue(mockEntity),
        };
        mockDocumentRepo = {
            create: jest.fn().mockResolvedValue(mockDocument),
        };
        useCase = new UploadDocument(mockDocumentRepo, mockDocumentTypeRepo, mockEntityRepo);
    });

    it('should upload document successfully', async () => {
        const result = await useCase.execute(baseDTO, FILE_URL);
        expect(result).toBeDefined();
        expect(mockDocumentRepo.create).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundError when document type not found in workspace', async () => {
        mockDocumentTypeRepo.findById.mockResolvedValue(null);
        await expect(useCase.execute(baseDTO, FILE_URL)).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when entity not found in workspace', async () => {
        mockEntityRepo.findById.mockResolvedValue(null);
        await expect(useCase.execute(baseDTO, FILE_URL)).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when document type requires metadata but none provided', async () => {
        mockDocumentTypeRepo.findById.mockResolvedValue({ ...mockDocType, hasMetadata: true });
        await expect(
            useCase.execute({ ...baseDTO, metadata: {} }, FILE_URL)
        ).rejects.toThrow(ValidationError);
    });
});
