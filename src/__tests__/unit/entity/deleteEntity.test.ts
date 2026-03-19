import { DeleteEntity } from "../../../modules/entity/application/use-cases/DeleteEntity";
import { ValidationError, NotFoundError, ForbiddenError } from "../../../shared/domain/errors/AppError";

const WORKSPACE_ID = '507f1f77bcf86cd799439011';
const USER_ID = '507f1f77bcf86cd799439012';
const ENTITY_ID = '507f1f77bcf86cd799439014';

describe('DeleteEntity use case', () =>{
    let mockEntityRepo:any;
    let useCase:DeleteEntity;

    beforeEach(()=>{
        mockEntityRepo={
            findById:jest.fn().mockResolvedValue({
                id:ENTITY_ID,
                workspaceId:WORKSPACE_ID,
                name: 'Acme',
            }),
            delete:jest.fn().mockResolvedValue(undefined),
        };
        useCase = new DeleteEntity(mockEntityRepo);
    });

    it('should delete entity successfully',async ()=>{
        await useCase.execute({
            id:ENTITY_ID,
            workspaceId:WORKSPACE_ID,
            userId:USER_ID,
        });
        expect(mockEntityRepo.delete).toHaveBeenCalledWith(ENTITY_ID);

    })

    it('should throw ValidationError for invalid entity id', async ()=>{
        await expect(
            useCase.execute({ id:'bad-id',workspaceId:WORKSPACE_ID, userId:USER_ID})
        ).rejects.toThrow(ValidationError)
     
    })

    it('should throw Notfound Error when Entity  not found', async ()=>{
        mockEntityRepo.findById.mockResolvedValue(null);
        await expect(useCase.execute({
            id:ENTITY_ID,
            workspaceId:WORKSPACE_ID,
            userId:USER_ID,
        })).rejects.toThrow(NotFoundError)
    })

    it('should throw ForbiddenError when entity belongs to differnt workspace', async () =>{
        mockEntityRepo.findById.mockResolvedValue({
            id:ENTITY_ID,
            workspaceId:'wrong-workspace-id',
            name:'Acme'
        })
        await expect(
            useCase.execute({id:ENTITY_ID, workspaceId:WORKSPACE_ID, userId: USER_ID})
        ).rejects.toThrow(ForbiddenError);
    })
}) 