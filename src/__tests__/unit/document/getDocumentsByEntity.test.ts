import { GetDocumentsByEntity } from '../../../modules/document/application/use-cases/GetDocumentsByEntity';

const WORKSPACE_ID = '507f1f77bcf86cd799439011';
const ENTITY_ID    = '507f1f77bcf86cd799439012';

describe('GetDocumentsByEntity use case', () => {
    let mockDocumentRepo: any;
    let useCase: GetDocumentsByEntity;

    beforeEach(() => {
        mockDocumentRepo = {
            findByEntity: jest.fn().mockResolvedValue([
                { id: '507f1f77bcf86cd799439013', workspaceId: WORKSPACE_ID, entityId: ENTITY_ID },
            ]),
        };
        useCase = new GetDocumentsByEntity(mockDocumentRepo);
    });

    it('should return documents for the given entity', async () => {
        const result = await useCase.execute(ENTITY_ID, WORKSPACE_ID);
        expect(Array.isArray(result)).toBe(true);
        expect(mockDocumentRepo.findByEntity).toHaveBeenCalledWith(ENTITY_ID, WORKSPACE_ID);
    });
});
