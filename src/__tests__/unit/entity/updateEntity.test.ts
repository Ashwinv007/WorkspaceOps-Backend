import { UpdateEntity } from "../../../modules/entity/application/use-cases/UpdateEntity";
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from "../../../shared/domain/errors/AppError";
import { EntityRole } from "../../../modules/entity/domain/entities/Entity";

const id = '507f1f77bcf86cd799439011';
const workspaceId = '507f1f77bcf86cd799439012';
const userId = '507f1f77bcf86cd799439013';
const name = 'Acme';

describe('UpdateEntity usecase', ()=>{
    let mockEntityRepo:any;
    let usecase:UpdateEntity;

    beforeEach(()=>{
        mockEntityRepo={
            findById:jest.fn().mockResolvedValue({
                id,
                workspaceId,
                name,
            }),
            update:jest.fn().mockResolvedValue({
                id,
                workspaceId,
                name,
            }),
            findByWorkspaceIdFiltered: jest.fn().mockResolvedValue([])
        };
        usecase=new UpdateEntity(mockEntityRepo);
    })

    it('should update entity successfully', async()=>{
        await usecase.execute({
            id,
            workspaceId,
            userId,
            name,
        });
        expect(mockEntityRepo.update).toHaveBeenCalledWith(id,expect.objectContaining({name}));
    })

    it('should throw validation error for invalid entity id', async()=>{
        await expect(usecase.execute({id:'bad-id',workspaceId,userId,name}))
        .rejects.toThrow(ValidationError);
    })

    it('should throw validation error for invalid workspace id', async()=>{
        await expect(usecase.execute({id,workspaceId:'bad-id',userId,name}))
        .rejects.toThrow(ValidationError);
    })

    it('should throw validation error for empty name', async()=>{
        await expect(usecase.execute({id,workspaceId,userId,name:''}))
        .rejects.toThrow(ValidationError);
    })

    it('should throw validation error for name longer than 255 characters', async()=>{
        await expect(usecase.execute({id,workspaceId,userId,name:'a'.repeat(256)}))
        .rejects.toThrow(ValidationError);
    })

    it('should throw validation error for invalid role', async()=>{
        await expect(usecase.execute({id,workspaceId,userId,name, role:'BadValue' as any}))
        .rejects.toThrow(ValidationError);
    })

    it('should throw not found error when entity not found', async()=>{
        mockEntityRepo.findById.mockResolvedValue(null);
        await expect(usecase.execute({id,workspaceId,userId,name}))
        .rejects.toThrow(NotFoundError);
    })

    it('should throw forbidden error when entity does not belong to workspace', async()=>{
        mockEntityRepo.findById.mockResolvedValue({
            id,
            workspaceId:'wrong-workspace-id',
            name,
        });
        await expect(usecase.execute({id,workspaceId,userId,name}))
        .rejects.toThrow(ForbiddenError);
    })

    it('should throw conflict error when self entity already exists', async()=>{
        mockEntityRepo.findByWorkspaceIdFiltered.mockResolvedValue([
            {id:'other-id'}
        ]);
       
        await expect(usecase.execute({id,workspaceId,userId,role:EntityRole.SELF}))
        .rejects.toThrow(ConflictError);
    })

    it('should throw validation error when no fields provided', async () => {
    await expect(usecase.execute({ id, workspaceId, userId }))
        .rejects.toThrow(ValidationError);
});

it('should throw not found error when parent not found', async () => {
    const parentId = '507f1f77bcf86cd799439014';
    mockEntityRepo.findById
        .mockResolvedValueOnce({ id, workspaceId, name })   // entity itself
        .mockResolvedValueOnce(null);                        // parent not found
    await expect(usecase.execute({ id, workspaceId, userId, name, parentId }))
        .rejects.toThrow(NotFoundError);
});

it('should throw validation error when parent is EMPLOYEE', async () => {
    const parentId = '507f1f77bcf86cd799439014';
    mockEntityRepo.findById
        .mockResolvedValueOnce({ id, workspaceId, name })
        .mockResolvedValueOnce({ id: parentId, role: EntityRole.EMPLOYEE });
    await expect(usecase.execute({ id, workspaceId, userId, name, parentId }))
        .rejects.toThrow(ValidationError);
});

})
