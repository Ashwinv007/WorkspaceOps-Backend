"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InviteUserToWorkspace = void 0;
const AppError_1 = require("../../../../shared/domain/errors/AppError");
const ValidationUtils_1 = require("../../../../shared/utils/ValidationUtils");
class InviteUserToWorkspace {
    constructor(workspaceRepo, workspaceMemberRepo, userRepo) {
        this.workspaceRepo = workspaceRepo;
        this.workspaceMemberRepo = workspaceMemberRepo;
        this.userRepo = userRepo;
    }
    async execute(dto) {
        // 1. Validate workspace ID format
        if (!(0, ValidationUtils_1.isValidObjectId)(dto.workspaceId)) {
            throw new AppError_1.ValidationError('Invalid workspace ID format');
        }
        // 2. Validate invited user ID format
        if (!(0, ValidationUtils_1.isValidObjectId)(dto.invitedUserId)) {
            throw new AppError_1.ValidationError('Invalid user ID format');
        }
        // 3. Verify workspace exists
        const workspace = await this.workspaceRepo.findById(dto.workspaceId);
        if (!workspace) {
            throw new AppError_1.NotFoundError('Workspace not found');
        }
        // 4. Verify invited user exists
        const user = await this.userRepo.findById(dto.invitedUserId);
        if (!user) {
            throw new AppError_1.NotFoundError('User not found');
        }
        // 5. Check if user is already a member
        const existingMembership = await this.workspaceMemberRepo.findByWorkspaceIdAndUserId(dto.workspaceId, dto.invitedUserId);
        if (existingMembership) {
            throw new AppError_1.ValidationError('User is already a member of this workspace');
        }
        // 6. Validate role
        const validRoles = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'];
        if (!validRoles.includes(dto.role)) {
            throw new AppError_1.ValidationError('Invalid role');
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
exports.InviteUserToWorkspace = InviteUserToWorkspace;
