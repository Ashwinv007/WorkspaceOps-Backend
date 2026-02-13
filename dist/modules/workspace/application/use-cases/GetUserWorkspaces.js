"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetUserWorkspaces = void 0;
class GetUserWorkspaces {
    constructor(workspaceRepo, workspaceMemberRepo) {
        this.workspaceRepo = workspaceRepo;
        this.workspaceMemberRepo = workspaceMemberRepo;
    }
    async execute(dto) {
        // 1. Get all workspace memberships for the user
        const memberships = await this.workspaceMemberRepo.findByUserId(dto.userId);
        // 2. Fetch workspace details for each membership
        const workspacesWithRoles = [];
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
exports.GetUserWorkspaces = GetUserWorkspaces;
