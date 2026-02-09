"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceRepositoryImpl = void 0;
const Workspace_1 = require("../../domain/entities/Workspace");
const WorkspaceModel_1 = require("./WorkspaceModel");
class WorkspaceRepositoryImpl {
    async create(workspace) {
        const doc = await WorkspaceModel_1.WorkspaceModel.create({
            tenantId: workspace.tenantId,
            name: workspace.name
        });
        return this.toDomain(doc);
    }
    async findById(id) {
        const doc = await WorkspaceModel_1.WorkspaceModel.findById(id);
        if (!doc)
            return null;
        return this.toDomain(doc);
    }
    async findByTenantId(tenantId) {
        const docs = await WorkspaceModel_1.WorkspaceModel.find({ tenantId });
        return docs.map(doc => this.toDomain(doc));
    }
    toDomain(doc) {
        return new Workspace_1.Workspace(doc._id.toString(), doc.tenantId, doc.name, doc.createdAt);
    }
}
exports.WorkspaceRepositoryImpl = WorkspaceRepositoryImpl;
