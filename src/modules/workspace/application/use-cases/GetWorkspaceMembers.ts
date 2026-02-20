import { IWorkspaceMemberRepository } from '../../domain/repositories/IWorkspaceMemberRepository';
import { IWorkspaceRepository } from '../../domain/repositories/IWorkspaceRepository';
import { WorkspaceMember } from '../../domain/entities/WorkspaceMember';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/AppError';
import { isValidObjectId } from '../../../../shared/utils/ValidationUtils';

export interface GetWorkspaceMembersDTO {
    workspaceId: string;
    requestingUserId: string;
}

export class GetWorkspaceMembers {
    constructor(
        private readonly workspaceRepo: IWorkspaceRepository,
        private readonly workspaceMemberRepo: IWorkspaceMemberRepository
    ) {}

    async execute(dto: GetWorkspaceMembersDTO): Promise<WorkspaceMember[]> {
        if (!isValidObjectId(dto.workspaceId)) {
            throw new ValidationError('Invalid workspace ID format');
        }

        const workspace = await this.workspaceRepo.findById(dto.workspaceId);
        if (!workspace) {
            throw new NotFoundError('Workspace not found');
        }

        return this.workspaceMemberRepo.findByWorkspaceId(dto.workspaceId);
    }
}
