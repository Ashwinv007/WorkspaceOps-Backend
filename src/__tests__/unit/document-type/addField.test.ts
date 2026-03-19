import { AddField } from '../../../modules/document-type/application/use-cases/AddField';
import { ValidationError, NotFoundError } from '../../../shared/domain/errors/AppError';
import { FieldType } from '../../../modules/document-type/domain/enums/FieldType';

const WORKSPACE_ID     = '507f1f77bcf86cd799439011';
const DOCUMENT_TYPE_ID = '507f1f77bcf86cd799439012';
const USER_ID          = '507f1f77bcf86cd799439013';

const mockDocType = { id: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID, name: 'Invoice', hasExpiry: true };
const existingField = { fieldKey: 'notes', fieldType: FieldType.TEXT, isRequired: false, isExpiryField: false };
const newField      = { fieldKey: '507f1f77bcf86cd799439014', workspaceId: WORKSPACE_ID, fieldKey2: 'newField', fieldType: FieldType.TEXT };

describe('AddField use case', () => {
    let mockDocumentTypeRepo: any;
    let useCase: AddField;

    beforeEach(() => {
        mockDocumentTypeRepo = {
            findByIdWithFields: jest.fn().mockResolvedValue({ documentType: mockDocType, fields: [existingField] }),
            addField:           jest.fn().mockResolvedValue({ id: '507f1f77bcf86cd799439014', fieldKey: 'newNotes', fieldType: FieldType.TEXT }),
        };
        useCase = new AddField(mockDocumentTypeRepo);
    });

    it('should add a text field successfully', async () => {
        const result = await useCase.execute({
            documentTypeId: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID, userId: USER_ID,
            fieldKey: 'contractValue', fieldType: FieldType.TEXT, isRequired: false, isExpiryField: false,
        });

        expect(result).toBeDefined();
        expect(mockDocumentTypeRepo.addField).toHaveBeenCalledTimes(1);
    });

    it('should throw ValidationError for invalid document type id', async () => {
        await expect(
            useCase.execute({ documentTypeId: 'bad-id', workspaceId: WORKSPACE_ID, userId: USER_ID, fieldKey: 'notes', fieldType: FieldType.TEXT, isRequired: false, isExpiryField: false })
        ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid workspaceId', async () => {
        await expect(
            useCase.execute({ documentTypeId: DOCUMENT_TYPE_ID, workspaceId: 'bad-id', userId: USER_ID, fieldKey: 'notes', fieldType: FieldType.TEXT, isRequired: false, isExpiryField: false })
        ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when document type does not exist', async () => {
        mockDocumentTypeRepo.findByIdWithFields.mockResolvedValue(null);
        await expect(
            useCase.execute({ documentTypeId: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID, userId: USER_ID, fieldKey: 'notes', fieldType: FieldType.TEXT, isRequired: false, isExpiryField: false })
        ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when document type belongs to different workspace', async () => {
        mockDocumentTypeRepo.findByIdWithFields.mockResolvedValue({
            documentType: { ...mockDocType, workspaceId: '999f1f77bcf86cd799439099' },
            fields: [],
        });
        await expect(
            useCase.execute({ documentTypeId: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID, userId: USER_ID, fieldKey: 'notes', fieldType: FieldType.TEXT, isRequired: false, isExpiryField: false })
        ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for duplicate field key', async () => {
        await expect(
            useCase.execute({ documentTypeId: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID, userId: USER_ID, fieldKey: 'notes', fieldType: FieldType.TEXT, isRequired: false, isExpiryField: false })
        ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when adding expiry field of non-date type', async () => {
        await expect(
            useCase.execute({ documentTypeId: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID, userId: USER_ID, fieldKey: 'newExpiry', fieldType: FieldType.TEXT, isRequired: true, isExpiryField: true })
        ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when adding expiry field to type without hasExpiry enabled', async () => {
        mockDocumentTypeRepo.findByIdWithFields.mockResolvedValue({
            documentType: { ...mockDocType, hasExpiry: false },
            fields: [],
        });
        await expect(
            useCase.execute({ documentTypeId: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID, userId: USER_ID, fieldKey: 'expiryDate', fieldType: FieldType.DATE, isRequired: true, isExpiryField: true })
        ).rejects.toThrow(ValidationError);
    });
});
