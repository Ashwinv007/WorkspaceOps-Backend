import { IWorkspaceRepository } from '../../domain/repositories/IWorkspaceRepository';
import { IWorkspaceMemberRepository } from '../../domain/repositories/IWorkspaceMemberRepository';
import { Workspace } from '../../domain/entities/Workspace';
import { WorkspaceRole } from '../../domain/entities/WorkspaceMember';

/**
 * Get User Workspaces Use Case (Application Layer)
 * 
 * Lists all workspaces that a user has access to, including their role in each.
 */

export interface GetUserWorkspacesDTO {
    userId: string;
}

export interface WorkspaceWithRole {
    workspace: Workspace;
    role: WorkspaceRole;
}

export class GetUserWorkspaces {
    constructor(
        private readonly workspaceRepo: IWorkspaceRepository,
        private readonly workspaceMemberRepo: IWorkspaceMemberRepository
    ) { }

    async execute(dto: GetUserWorkspacesDTO): Promise<WorkspaceWithRole[]> {
        // 1. Get all workspace memberships for the user
        const memberships = await this.workspaceMemberRepo.findByUserId(dto.userId);

        // 2. Fetch workspace details for each membership
        const workspacesWithRoles: WorkspaceWithRole[] = [];

        for (const membership of memberships) {
            const workspace = await this.workspaceRepo.findById(membership.workspaceId);

            if (workspace) {
                workspacesWithRoles.push({
                    workspace,
                    role: membership.role
                });
            }
        }

        return workspacesWithRoles;
    }
}
