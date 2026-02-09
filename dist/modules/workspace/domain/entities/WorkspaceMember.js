"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceMember = void 0;
const AppError_1 = require("../../../../shared/domain/errors/AppError");
class WorkspaceMember {
    constructor(id, workspaceId, userId, role, createdAt) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.userId = userId;
        this.role = role;
        this.createdAt = createdAt;
        this.validate();
    }
    validate() {
        if (!this.workspaceId)
            throw new AppError_1.ValidationError('Workspace ID is required');
        if (!this.userId)
            throw new AppError_1.ValidationError('User ID is required');
        if (!this.isValidRole(this.role)) {
            throw new AppError_1.ValidationError('Invalid role');
        }
    }
    isValidRole(role) {
        return ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'].includes(role);
    }
    static create(workspaceId, userId, role) {
        const tempMember = new WorkspaceMember('temp', workspaceId, userId, role);
        return {
            workspaceId: tempMember.workspaceId,
            userId: tempMember.userId,
            role: tempMember.role,
            validate: tempMember.validate.bind(tempMember)
        };
    }
}
exports.WorkspaceMember = WorkspaceMember;
