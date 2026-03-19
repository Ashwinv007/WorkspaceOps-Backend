import { GetEntityById } from "../../../modules/entity/application/use-cases/GetEntityById";
import { NotFoundError, ValidationError } from "../../../shared/domain/errors/AppError";

const WORKSPACE_ID = '507f1f77bcf86cd799439011';
const ENTITY_ID = '507f1f77bcf86cd799439014';

describe('GetEntityById use case', ()=>{
    let mockEntityRepo:any;
    let usecase:GetEntityById;

    beforeEach(()=>{
        mockEntityRepo={
            findById:jest.fn().mockResolvedValue({
                id:ENTITY_ID,
                workspaceId:WORKSPACE_ID,
                name:'Acme',
            }),
        };
        usecase = new GetEntityById(mockEntityRepo);
    })

    it('should get entity by id successfully', async()=>{
        await usecase.execute({
            id:ENTITY_ID,
            workspaceId:WORKSPACE_ID,
        })
        expect(mockEntityRepo.findById).toHaveBeenCalledWith(ENTITY_ID);
    })

    it('should throw invalid entity id format error', async()=>{
        await expect(usecase.execute({id:'bad-id',workspaceId:WORKSPACE_ID}))
        .rejects.toThrow(ValidationError)
    })

    it('should throw invalid workspace id format error', async()=>{
        await expect(usecase.execute({id:ENTITY_ID,workspaceId:'bad-id'}))
        .rejects.toThrow(ValidationError)
    })

    it('should throw not found error',async()=>{
        mockEntityRepo.findById.mockResolvedValue(null);
        await expect(usecase.execute({id:ENTITY_ID,workspaceId:WORKSPACE_ID}))
        .rejects.toThrow(NotFoundError)
    })
})