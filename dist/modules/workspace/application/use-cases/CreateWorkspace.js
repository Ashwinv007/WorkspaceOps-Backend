"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateWorkspace = void 0;
const AppError_1 = require("../../../../shared/domain/errors/AppError");
class CreateWorkspace {
    constructor(tenantRepo, workspaceRepo, workspaceMemberRepo) {
        this.tenantRepo = tenantRepo;
        this.workspaceRepo = workspaceRepo;
        this.workspaceMemberRepo = workspaceMemberRepo;
    }
    async execute(dto) {
        // 1. Validate tenant exists
        const tenant = await this.tenantRepo.findById(dto.tenantId);
        if (!tenant) {
            throw new AppError_1.NotFoundError('Tenant not found');
        }
        // 2. Validate workspace name
        if (!dto.name || dto.name.trim().length === 0) {
            throw new AppError_1.ValidationError('Workspace name is required');
        }
        // 3. Create workspace
        const workspace = await this.workspaceRepo.create({
            tenantId: dto.tenantId,
            name: dto.name.trim()
        });
        // 4. Create workspace membership (creator is OWNER)
        const membership = await this.workspaceMemberRepo.create({
            workspaceId: workspace.id,
            userId: dto.createdByUserId,
            role: 'OWNER'
        });
        return {
            workspace,
            membership
        };
    }
}
exports.CreateWorkspace = CreateWorkspace;
