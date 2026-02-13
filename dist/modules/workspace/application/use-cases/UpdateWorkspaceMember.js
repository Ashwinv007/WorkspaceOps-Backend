"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateWorkspaceMember = void 0;
const AppError_1 = require("../../../../shared/domain/errors/AppError");
class UpdateWorkspaceMember {
    constructor(workspaceMemberRepo) {
        this.workspaceMemberRepo = workspaceMemberRepo;
    }
    async execute(dto) {
        // 1. Find the member to update
        const member = await this.workspaceMemberRepo.findByWorkspaceIdAndUserId(dto.workspaceId, 
        // We need to find by member ID, but our current interface doesn't support that
        // For now, we'll need to fetch by ID directly
        '' // This is a limitation - we'll handle it in the implementation
        );
        // Better approach: Get all members and find the one to update
        const allMembers = await this.workspaceMemberRepo.findByWorkspaceId(dto.workspaceId);
        const memberToUpdate = allMembers.find(m => m.id === dto.memberId);
        if (!memberToUpdate) {
            throw new AppError_1.NotFoundError('Workspace member not found');
        }
        // 2. If changing from OWNER, ensure there's at least one other OWNER
        if (memberToUpdate.role === 'OWNER' && dto.newRole !== 'OWNER') {
            const owners = allMembers.filter(m => m.role === 'OWNER');
            if (owners.length <= 1) {
                throw new AppError_1.ValidationError('Cannot remove the last owner. Please assign another owner first.');
            }
        }
        // 3. Validate new role
        const validRoles = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];
        if (!validRoles.includes(dto.newRole)) {
            throw new AppError_1.ValidationError('Invalid role');
        }
        // 4. Update the member's role
        const updatedMember = await this.workspaceMemberRepo.update(dto.memberId, {
            role: dto.newRole
        });
        return updatedMember;
    }
}
exports.UpdateWorkspaceMember = UpdateWorkspaceMember;
