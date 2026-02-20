import { IWorkspaceRepository } from '../../domain/repositories/IWorkspaceRepository';
import { IWorkspaceMemberRepository } from '../../domain/repositories/IWorkspaceMemberRepository';
import { IUserRepository } from '../../../auth/domain/repositories/IUserRepository';
import { WorkspaceMember, WorkspaceRole } from '../../domain/entities/WorkspaceMember';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/AppError';
import { isValidObjectId } from '../../../../shared/utils/ValidationUtils';
import { IAuditLogService } from '../../../audit-log/application/services/IAuditLogService';
import { AuditAction } from '../../../audit-log/domain/enums/AuditAction';

/**
 * Invite User to Workspace Use Case (Application Layer)
 * 
 * Adds a user to a workspace with a specific role.
 * Validates that workspace exists, user exists, and user is not already a member.
 */

export interface InviteUserToWorkspaceDTO {
    workspaceId: string;
    invitedEmail: string;
    role: WorkspaceRole;
    invitedByUserId: string; // For audit purposes (not used in MVP)
}

export class InviteUserToWorkspace {
    constructor(
        private readonly workspaceRepo: IWorkspaceRepository,
        private readonly workspaceMemberRepo: IWorkspaceMemberRepository,
        private readonly userRepo: IUserRepository,
        private readonly auditLogService?: IAuditLogService
    ) { }

    async execute(dto: InviteUserToWorkspaceDTO): Promise<WorkspaceMember> {
        // 1. Validate workspace ID format
        if (!isValidObjectId(dto.workspaceId)) {
            throw new ValidationError('Invalid workspace ID format');
        }

        // 2. Verify workspace exists
        const workspace = await this.workspaceRepo.findById(dto.workspaceId);
        if (!workspace) {
            throw new NotFoundError('Workspace not found');
        }

        // 4. Resolve email → user (throws 404 if email not registered)
        const user = await this.userRepo.findByEmail(dto.invitedEmail);
        if (!user) {
            throw new NotFoundError('No user found with that email address');
        }

        // 5. Check if user is already a member
        const existingMembership = await this.workspaceMemberRepo.findByWorkspaceIdAndUserId(
            dto.workspaceId,
            user.id
        );

        if (existingMembership) {
            throw new ValidationError('User is already a member of this workspace');
        }

        // 6. Validate role
        const validRoles: WorkspaceRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];
        if (!validRoles.includes(dto.role)) {
            throw new ValidationError('Invalid role');
        }

        // 7. Create workspace membership (store resolved userId internally)
        const membership = await this.workspaceMemberRepo.create({
            workspaceId: dto.workspaceId,
            userId: user.id,
            role: dto.role
        });

        // 8. Audit log (fire-and-forget)
        await this.auditLogService?.log({
            workspaceId: dto.workspaceId,
            userId: dto.invitedByUserId,
            action: AuditAction.WORKSPACE_MEMBER_INVITED,
            targetType: 'WorkspaceMember',
            targetId: membership.id,
        });

        return membership;
    }
}
