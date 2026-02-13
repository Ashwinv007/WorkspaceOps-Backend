"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InviteUserToWorkspace = void 0;
const AppError_1 = require("../../../../shared/domain/errors/AppError");
class InviteUserToWorkspace {
    constructor(workspaceRepo, workspaceMemberRepo, userRepo) {
        this.workspaceRepo = workspaceRepo;
        this.workspaceMemberRepo = workspaceMemberRepo;
        this.userRepo = userRepo;
    }
    async execute(dto) {
        // 1. Verify workspace exists
        const workspace = await this.workspaceRepo.findById(dto.workspaceId);
        if (!workspace) {
            throw new AppError_1.NotFoundError('Workspace not found');
        }
        // 2. Verify invited user exists
        const user = await this.userRepo.findById(dto.invitedUserId);
        if (!user) {
            throw new AppError_1.NotFoundError('User not found');
        }
        // 3. Check if user is already a member
        const existingMembership = await this.workspaceMemberRepo.findByWorkspaceIdAndUserId(dto.workspaceId, dto.invitedUserId);
        if (existingMembership) {
            throw new AppError_1.ValidationError('User is already a member of this workspace');
        }
        // 4. Validate role
        const validRoles = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];
        if (!validRoles.includes(dto.role)) {
            throw new AppError_1.ValidationError('Invalid role');
        }
        // 5. Create workspace membership
        const membership = await this.workspaceMemberRepo.create({
            workspaceId: dto.workspaceId,
            userId: dto.invitedUserId,
            role: dto.role
        });
        return membership;
    }
}
exports.InviteUserToWorkspace = InviteUserToWorkspace;
