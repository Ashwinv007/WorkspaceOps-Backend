import {GetEntities} from "../../../modules/entity/application/use-cases/GetEntities";
import { ValidationError } from "../../../shared/domain/errors/AppError";

const WORKSPACE_ID = '507f1f77bcf86cd799439011';
const ENTITY_ID = '507f1f77bcf86cd799439014';

describe('Get Entity', ()=>{
    let mockEntityRepo:any;
    let usecase:GetEntities;

    beforeEach(()=>{
        mockEntityRepo={
            findByWorkspaceIdFiltered:jest.fn().mockResolvedValue([
                {
                    id:ENTITY_ID,
                    
                }
            ])


            
        }
        usecase=new GetEntities(mockEntityRepo);

    })

    it('should get entities successfully', async()=>{
        await usecase.execute({
            workspaceId:WORKSPACE_ID,
        })
        expect(mockEntityRepo.findByWorkspaceIdFiltered).toHaveBeenCalledWith(WORKSPACE_ID,undefined,undefined);
    })
it('should throw validaton error', async()=>{
    await expect(usecase.execute({workspaceId:'bad-id'}))
    .rejects.toThrow(ValidationError)
})
})