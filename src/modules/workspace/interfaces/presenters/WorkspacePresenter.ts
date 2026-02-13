import { Workspace } from '../../domain/entities/Workspace';
import { WorkspaceMember, WorkspaceRole } from '../../domain/entities/WorkspaceMember';
import { WorkspaceWithRole } from '../../application/use-cases/GetUserWorkspaces';

/**
 * Workspace Presenter (Interfaces Layer)
 * 
 * Formats workspace data for HTTP responses.
 * Transforms domain entities into JSON response format.
 */
export class WorkspacePresenter {
    /**
     * Format a single workspace with optional role
     */
    toWorkspaceResponse(workspace: Workspace, role?: WorkspaceRole) {
        return {
            success: true,
            data: {
                id: workspace.id,
                tenantId: workspace.tenantId,
                name: workspace.name,
                createdAt: workspace.createdAt,
                ...(role && { userRole: role })
            }
        };
    }

    /**
     * Format a list of workspaces with roles
     */
    toWorkspaceListResponse(workspaces: WorkspaceWithRole[]) {
        return {
            success: true,
            data: workspaces.map(w => ({
                id: w.workspace.id,
                tenantId: w.workspace.tenantId,
                name: w.workspace.name,
                createdAt: w.workspace.createdAt,
                userRole: w.role
            })),
            count: workspaces.length
        };
    }

    /**
     * Format a workspace member
     */
    toMemberResponse(member: WorkspaceMember) {
        return {
            success: true,
            data: {
                id: member.id,
                workspaceId: member.workspaceId,
                userId: member.userId,
                role: member.role,
                createdAt: member.createdAt
            }
        };
    }
}
