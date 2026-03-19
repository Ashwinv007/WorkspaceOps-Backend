import { GetDocuments } from '../../../modules/document/application/use-cases/GetDocuments';

const WORKSPACE_ID = '507f1f77bcf86cd799439011';

describe('GetDocuments use case', () => {
    let mockDocumentRepo: any;
    let useCase: GetDocuments;

    beforeEach(() => {
        mockDocumentRepo = {
            findByWorkspace: jest.fn().mockResolvedValue([
                { id: '507f1f77bcf86cd799439012', workspaceId: WORKSPACE_ID, name: 'Invoice.pdf' },
            ]),
        };
        useCase = new GetDocuments(mockDocumentRepo);
    });

    it('should return documents for workspace', async () => {
        const result = await useCase.execute(WORKSPACE_ID, {});
        expect(Array.isArray(result)).toBe(true);
        expect(mockDocumentRepo.findByWorkspace).toHaveBeenCalledTimes(1);
    });
});
