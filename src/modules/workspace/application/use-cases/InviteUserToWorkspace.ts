import { IWorkspaceRepository } from '../../domain/repositories/IWorkspaceRepository';
import { IWorkspaceMemberRepository } from '../../domain/repositories/IWorkspaceMemberRepository';
import { IUserRepository } from '../../../auth/domain/repositories/IUserRepository';
import { WorkspaceMember, WorkspaceRole } from '../../domain/entities/WorkspaceMember';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/AppError';
import { isValidObjectId } from '../../../../shared/utils/ValidationUtils';

/**
 * Invite User to Workspace Use Case (Application Layer)
 * 
 * Adds a user to a workspace with a specific role.
 * Validates that workspace exists, user exists, and user is not already a member.
 */

export interface InviteUserToWorkspaceDTO {
    workspaceId: string;
    invitedUserId: string;
    role: WorkspaceRole;
    invitedByUserId: string; // For audit purposes (not used in MVP)
}

export class InviteUserToWorkspace {
    constructor(
        private readonly workspaceRepo: IWorkspaceRepository,
        private readonly workspaceMemberRepo: IWorkspaceMemberRepository,
        private readonly userRepo: IUserRepository
    ) { }

    async execute(dto: InviteUserToWorkspaceDTO): Promise<WorkspaceMember> {
        // 1. Validate workspace ID format
        if (!isValidObjectId(dto.workspaceId)) {
            throw new ValidationError('Invalid workspace ID format');
        }

        // 2. Validate invited user ID format
        if (!isValidObjectId(dto.invitedUserId)) {
            throw new ValidationError('Invalid user ID format');
        }

        // 3. Verify workspace exists
        const workspace = await this.workspaceRepo.findById(dto.workspaceId);
        if (!workspace) {
            throw new NotFoundError('Workspace not found');
        }

        // 4. Verify invited user exists
        const user = await this.userRepo.findById(dto.invitedUserId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        // 5. Check if user is already a member
        const existingMembership = await this.workspaceMemberRepo.findByWorkspaceIdAndUserId(
            dto.workspaceId,
            dto.invitedUserId
        );

        if (existingMembership) {
            throw new ValidationError('User is already a member of this workspace');
        }

        // 6. Validate role
        const validRoles: WorkspaceRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];
        if (!validRoles.includes(dto.role)) {
            throw new ValidationError('Invalid role');
        }

        // 7. Create workspace membership
        const membership = await this.workspaceMemberRepo.create({
            workspaceId: dto.workspaceId,
            userId: dto.invitedUserId,
            role: dto.role
        });

        return membership;
    }
}
