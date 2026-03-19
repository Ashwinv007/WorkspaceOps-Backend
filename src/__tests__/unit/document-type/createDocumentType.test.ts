import { CreateDocumentType } from '../../../modules/document-type/application/use-cases/CreateDocumentType';
import { ValidationError, NotFoundError } from '../../../shared/domain/errors/AppError';
import { FieldType } from '../../../modules/document-type/domain/enums/FieldType';

const WORKSPACE_ID     = '507f1f77bcf86cd799439011';
const USER_ID          = '507f1f77bcf86cd799439012';
const DOCUMENT_TYPE_ID = '507f1f77bcf86cd799439013';

const validTextField = { fieldKey: 'notes', fieldType: FieldType.TEXT, isRequired: false, isExpiryField: false };
const validExpiryField = { fieldKey: 'expiryDate', fieldType: FieldType.DATE, isRequired: true, isExpiryField: true };

const mockDocTypeResult = {
    documentType: { id: DOCUMENT_TYPE_ID, workspaceId: WORKSPACE_ID, name: 'Invoice' },
    fields: [],
};

describe('CreateDocumentType use case', () => {
    let mockDocumentTypeRepo: any;
    let mockWorkspaceRepo: any;
    let useCase: CreateDocumentType;

    beforeEach(() => {
        mockWorkspaceRepo = {
            findById: jest.fn().mockResolvedValue({ id: WORKSPACE_ID, name: 'Test Workspace' }),
        };
        mockDocumentTypeRepo = {
            create: jest.fn().mockResolvedValue(mockDocTypeResult),
        };
        useCase = new CreateDocumentType(mockDocumentTypeRepo, mockWorkspaceRepo);
    });

    it('should create document type without metadata', async () => {
        const result = await useCase.execute({
            workspaceId: WORKSPACE_ID,
            userId: USER_ID,
            name: 'Invoice',
            hasMetadata: false,
            hasExpiry: false,
            fields: [],
        });

        expect(result).toHaveProperty('documentType');
        expect(mockDocumentTypeRepo.create).toHaveBeenCalledTimes(1);
    });

    it('should create document type with metadata fields', async () => {
        const result = await useCase.execute({
            workspaceId: WORKSPACE_ID,
            userId: USER_ID,
            name: 'Contract',
            hasMetadata: true,
            hasExpiry: false,
            fields: [validTextField],
        });

        expect(result).toHaveProperty('documentType');
    });

    it('should create document type with expiry tracking', async () => {
        const result = await useCase.execute({
            workspaceId: WORKSPACE_ID,
            userId: USER_ID,
            name: 'Passport',
            hasMetadata: true,
            hasExpiry: true,
            fields: [validExpiryField],
        });

        expect(result).toHaveProperty('documentType');
    });

    it('should throw ValidationError for invalid workspaceId', async () => {
        await expect(
            useCase.execute({ workspaceId: 'bad-id', userId: USER_ID, name: 'Invoice', hasMetadata: false, hasExpiry: false, fields: [] })
        ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when workspace does not exist', async () => {
        mockWorkspaceRepo.findById.mockResolvedValue(null);
        await expect(
            useCase.execute({ workspaceId: WORKSPACE_ID, userId: USER_ID, name: 'Invoice', hasMetadata: false, hasExpiry: false, fields: [] })
        ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for empty name', async () => {
        await expect(
            useCase.execute({ workspaceId: WORKSPACE_ID, userId: USER_ID, name: '  ', hasMetadata: false, hasExpiry: false, fields: [] })
        ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when hasMetadata=true but no fields provided', async () => {
        await expect(
            useCase.execute({ workspaceId: WORKSPACE_ID, userId: USER_ID, name: 'Invoice', hasMetadata: true, hasExpiry: false, fields: [] })
        ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when hasExpiry=true but no expiry field provided', async () => {
        await expect(
            useCase.execute({
                workspaceId: WORKSPACE_ID, userId: USER_ID, name: 'Invoice',
                hasMetadata: true, hasExpiry: true,
                fields: [validTextField], // has a field but not an expiry field
            })
        ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when expiry field is not of type date', async () => {
        await expect(
            useCase.execute({
                workspaceId: WORKSPACE_ID, userId: USER_ID, name: 'Invoice',
                hasMetadata: true, hasExpiry: true,
                fields: [{ fieldKey: 'expiry', fieldType: FieldType.TEXT, isRequired: true, isExpiryField: true }],
            })
        ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for duplicate field keys', async () => {
        await expect(
            useCase.execute({
                workspaceId: WORKSPACE_ID, userId: USER_ID, name: 'Invoice',
                hasMetadata: true, hasExpiry: false,
                fields: [validTextField, { ...validTextField }], // same fieldKey twice
            })
        ).rejects.toThrow(ValidationError);
    });
});
