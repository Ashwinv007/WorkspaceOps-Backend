"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceMemberRepositoryImpl = void 0;
const WorkspaceMember_1 = require("../../domain/entities/WorkspaceMember");
const WorkspaceMemberModel_1 = require("./WorkspaceMemberModel");
class WorkspaceMemberRepositoryImpl {
    async create(member) {
        const doc = await WorkspaceMemberModel_1.WorkspaceMemberModel.create({
            workspaceId: member.workspaceId,
            userId: member.userId,
            role: member.role
        });
        return this.toDomain(doc);
    }
    async findByWorkspaceIdAndUserId(workspaceId, userId) {
        const doc = await WorkspaceMemberModel_1.WorkspaceMemberModel.findOne({ workspaceId, userId });
        if (!doc)
            return null;
        return this.toDomain(doc);
    }
    toDomain(doc) {
        return new WorkspaceMember_1.WorkspaceMember(doc._id.toString(), doc.workspaceId, doc.userId, doc.role, doc.createdAt);
    }
}
exports.WorkspaceMemberRepositoryImpl = WorkspaceMemberRepositoryImpl;
