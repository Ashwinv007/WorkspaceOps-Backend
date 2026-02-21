import { IWorkspaceMemberRepository } from '../../domain/repositories/IWorkspaceMemberRepository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/AppError';
import { IAuditLogService } from '../../../audit-log/application/services/IAuditLogService';
import { AuditAction } from '../../../audit-log/domain/enums/AuditAction';

/**
 * Remove User from Workspace Use Case (Application Layer)
 * 
 * Removes a user from a workspace.
 * Validates that there's always at least one OWNER.
 */

export interface RemoveUserFromWorkspaceDTO {
    workspaceId: string;
    memberId: string;
    removedByUserId: string; // For audit purposes (not used in MVP)
}

export class RemoveUserFromWorkspace {
    constructor(
        private readonly workspaceMemberRepo: IWorkspaceMemberRepository,
        private readonly auditLogService?: IAuditLogService
    ) { }

    async execute(dto: RemoveUserFromWorkspaceDTO): Promise<void> {
        // 1. Find the member to remove by ID (search within workspace members)
        const allMembers = await this.workspaceMemberRepo.findByWorkspaceId(dto.workspaceId);
        const memberToRemove = allMembers.find(m => m.id === dto.memberId);

        if (!memberToRemove) {
            throw new NotFoundError('Workspace member not found');
        }

        // 2. If removing an OWNER, use an atomic DB count — not an in-memory check.
        // This prevents the race where two concurrent removals both see 2 owners and both proceed.
        if (memberToRemove.role === 'OWNER') {
            const ownerCount = await this.workspaceMemberRepo.countByRole(dto.workspaceId, 'OWNER');
            if (ownerCount <= 1) {
                throw new ValidationError('Cannot remove the last owner from the workspace');
            }
        }

        // 3. Delete the member
        await this.workspaceMemberRepo.delete(dto.memberId);

        // 5. Audit log (fire-and-forget)
        await this.auditLogService?.log({
            workspaceId: dto.workspaceId,
            userId: dto.removedByUserId,
            action: AuditAction.WORKSPACE_MEMBER_REMOVED,
            targetType: 'WorkspaceMember',
            targetId: dto.memberId,
        });
    }
}
