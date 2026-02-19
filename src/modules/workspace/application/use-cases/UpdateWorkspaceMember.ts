import { IWorkspaceMemberRepository } from '../../domain/repositories/IWorkspaceMemberRepository';
import { WorkspaceMember, WorkspaceRole } from '../../domain/entities/WorkspaceMember';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/AppError';
import { IAuditLogService } from '../../../audit-log/application/services/IAuditLogService';
import { AuditAction } from '../../../audit-log/domain/enums/AuditAction';

/**
 * Update Workspace Member Use Case (Application Layer)
 * 
 * Changes a user's role in a workspace.
 * Validates that there's always at least one OWNER.
 */

export interface UpdateWorkspaceMemberDTO {
    workspaceId: string;
    memberId: string;
    newRole: WorkspaceRole;
    updatedByUserId: string; // For audit purposes (not used in MVP)
}

export class UpdateWorkspaceMember {
    constructor(
        private readonly workspaceMemberRepo: IWorkspaceMemberRepository,
        private readonly auditLogService?: IAuditLogService
    ) { }

    async execute(dto: UpdateWorkspaceMemberDTO): Promise<WorkspaceMember> {
        // 1. Find the member to update
        const member = await this.workspaceMemberRepo.findByWorkspaceIdAndUserId(
            dto.workspaceId,
            // We need to find by member ID, but our current interface doesn't support that
            // For now, we'll need to fetch by ID directly
            '' // This is a limitation - we'll handle it in the implementation
        );

        // Better approach: Get all members and find the one to update
        const allMembers = await this.workspaceMemberRepo.findByWorkspaceId(dto.workspaceId);
        const memberToUpdate = allMembers.find(m => m.id === dto.memberId);

        if (!memberToUpdate) {
            throw new NotFoundError('Workspace member not found');
        }

        // 2. If changing from OWNER, ensure there's at least one other OWNER
        if (memberToUpdate.role === 'OWNER' && dto.newRole !== 'OWNER') {
            const owners = allMembers.filter(m => m.role === 'OWNER');
            if (owners.length <= 1) {
                throw new ValidationError('Cannot remove the last owner. Please assign another owner first.');
            }
        }

        // 3. Validate new role
        const validRoles: WorkspaceRole[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];
        if (!validRoles.includes(dto.newRole)) {
            throw new ValidationError('Invalid role');
        }

        // 4. Update the member's role
        const updatedMember = await this.workspaceMemberRepo.update(dto.memberId, {
            role: dto.newRole
        } as Partial<WorkspaceMember>);

        // 5. Audit log (fire-and-forget)
        await this.auditLogService?.log({
            workspaceId: dto.workspaceId,
            userId: dto.updatedByUserId,
            action: AuditAction.WORKSPACE_MEMBER_ROLE_UPDATED,
            targetType: 'WorkspaceMember',
            targetId: dto.memberId,
        });

        return updatedMember;
    }
}
