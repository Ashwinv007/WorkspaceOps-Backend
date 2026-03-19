import { UpdateDocumentType } from '../../../modules/document-type/application/use-cases/UpdateDocumentType';
import { ValidationError, NotFoundError } from '../../../shared/domain/errors/AppError';
import { FieldType } from '../../../modules/document-type/domain/enums/FieldType';

const WORKSPACE_ID     = '507f1f77bcf86cd799439011';
const DOCUMENT_TYPE_ID = '507f1f77bcf86cd799439012';
const USER_ID          = '507f1f77bcf86cd799439013';

const expiryField = { fieldKey: 'expiryDate', fieldType: FieldType.DATE, isRequired: true, isExpiryField: true };
const mockDocType = { id: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID, name: 'Invoice', hasMetadata: true, hasExpiry: false };

describe('UpdateDocumentType use case', () => {
    let mockDocumentTypeRepo: any;
    let useCase: UpdateDocumentType;

    beforeEach(() => {
        mockDocumentTypeRepo = {
            findByIdWithFields: jest.fn().mockResolvedValue({ documentType: mockDocType, fields: [] }),
            update:             jest.fn().mockResolvedValue({ documentType: { ...mockDocType, name: 'Updated' }, fields: [] }),
        };
        useCase = new UpdateDocumentType(mockDocumentTypeRepo);
    });

    it('should update document type name successfully', async () => {
        const result = await useCase.execute({
            id: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID, userId: USER_ID, name: 'Updated Invoice',
        });

        expect(result).toHaveProperty('documentType');
        expect(mockDocumentTypeRepo.update).toHaveBeenCalledTimes(1);
    });

    it('should throw ValidationError for invalid document type id', async () => {
        await expect(
            useCase.execute({ id: 'bad-id', workspaceId: WORKSPACE_ID, userId: USER_ID, name: 'Updated' })
        ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid workspaceId', async () => {
        await expect(
            useCase.execute({ id: DOCUMENT_TYPE_ID, workspaceId: 'bad-id', userId: USER_ID, name: 'Updated' })
        ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when document type does not exist', async () => {
        mockDocumentTypeRepo.findByIdWithFields.mockResolvedValue(null);
        await expect(
            useCase.execute({ id: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID, userId: USER_ID, name: 'Updated' })
        ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when document type belongs to different workspace', async () => {
        mockDocumentTypeRepo.findByIdWithFields.mockResolvedValue({
            documentType: { ...mockDocType, workspaceId: '999f1f77bcf86cd799439099' },
            fields: [],
        });
        await expect(
            useCase.execute({ id: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID, userId: USER_ID, name: 'Updated' })
        ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for empty name', async () => {
        await expect(
            useCase.execute({ id: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID, userId: USER_ID, name: '' })
        ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when enabling hasExpiry without any expiry field', async () => {
        // No expiry field exists — enabling hasExpiry should fail
        mockDocumentTypeRepo.findByIdWithFields.mockResolvedValue({ documentType: mockDocType, fields: [] });
        await expect(
            useCase.execute({ id: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID, userId: USER_ID, hasExpiry: true })
        ).rejects.toThrow(ValidationError);
    });

    it('should allow enabling hasExpiry when an expiry field already exists', async () => {
        mockDocumentTypeRepo.findByIdWithFields.mockResolvedValue({
            documentType: mockDocType,
            fields: [expiryField],
        });
        const result = await useCase.execute({
            id: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID, userId: USER_ID, hasExpiry: true,
        });
        expect(result).toHaveProperty('documentType');
    });
});
