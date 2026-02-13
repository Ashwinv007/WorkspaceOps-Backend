"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoveUserFromWorkspace = void 0;
const AppError_1 = require("../../../../shared/domain/errors/AppError");
class RemoveUserFromWorkspace {
    constructor(workspaceMemberRepo) {
        this.workspaceMemberRepo = workspaceMemberRepo;
    }
    async execute(dto) {
        // 1. Get all members in the workspace
        const allMembers = await this.workspaceMemberRepo.findByWorkspaceId(dto.workspaceId);
        // 2. Find the member to remove
        const memberToRemove = allMembers.find(m => m.id === dto.memberId);
        if (!memberToRemove) {
            throw new AppError_1.NotFoundError('Workspace member not found');
        }
        // 3. If removing an OWNER, ensure there's at least one other OWNER
        if (memberToRemove.role === 'OWNER') {
            const owners = allMembers.filter(m => m.role === 'OWNER');
            if (owners.length <= 1) {
                throw new AppError_1.ValidationError('Cannot remove the last owner from the workspace');
            }
        }
        // 4. Delete the member
        await this.workspaceMemberRepo.delete(dto.memberId);
    }
}
exports.RemoveUserFromWorkspace = RemoveUserFromWorkspace;
