import { GetExpiringDocuments } from '../../../modules/document/application/use-cases/GetExpiringDocuments';

const WORKSPACE_ID = '507f1f77bcf86cd799439011';

describe('GetExpiringDocuments use case', () => {
    let mockDocumentRepo: any;
    let useCase: GetExpiringDocuments;

    beforeEach(() => {
        mockDocumentRepo = {
            findExpiringDocuments: jest.fn().mockResolvedValue([
                { id: '507f1f77bcf86cd799439012', workspaceId: WORKSPACE_ID, name: 'Passport.pdf' },
            ]),
        };
        useCase = new GetExpiringDocuments(mockDocumentRepo);
    });

    it('should return expiring documents with default threshold', async () => {
        const result = await useCase.execute(WORKSPACE_ID);
        expect(Array.isArray(result)).toBe(true);
        expect(mockDocumentRepo.findExpiringDocuments).toHaveBeenCalledWith(WORKSPACE_ID, 30);
    });

    it('should use custom days threshold when provided', async () => {
        await useCase.execute(WORKSPACE_ID, 14);
        expect(mockDocumentRepo.findExpiringDocuments).toHaveBeenCalledWith(WORKSPACE_ID, 14);
    });
});
