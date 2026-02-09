"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignupUser = void 0;
const User_1 = require("../../domain/entities/User");
const AppError_1 = require("../../../../shared/domain/errors/AppError");
const Tenant_1 = require("../../../workspace/domain/entities/Tenant");
const Workspace_1 = require("../../../workspace/domain/entities/Workspace");
const WorkspaceMember_1 = require("../../../workspace/domain/entities/WorkspaceMember");
/**
 * Signup User Use Case (Application Layer)
 *
 * Orchestrates the user signup workflow:
 * 1. Check if user already exists
 * 2. Hash password
 * 3. Create user
 * 4. Create tenant for user
 * 5. Create default workspace
 * 6. Assign OWNER role to user in workspace
 * 7. Generate authentication token
 *
 * This use case depends only on abstractions (interfaces), not concrete implementations.
 */
class SignupUser {
    constructor(userRepo, tenantRepo, workspaceRepo, workspaceMemberRepo, tokenService) {
        this.userRepo = userRepo;
        this.tenantRepo = tenantRepo;
        this.workspaceRepo = workspaceRepo;
        this.workspaceMemberRepo = workspaceMemberRepo;
        this.tokenService = tokenService;
    }
    async execute(dto) {
        // 1. Check if user already exists
        const existingUser = await this.userRepo.findByEmail(dto.email);
        if (existingUser) {
            throw new AppError_1.AppError('User with this email already exists', 400);
        }
        // 2. Hash password
        const passwordHash = await this.tokenService.hashPassword(dto.password);
        // 3. Create user entity (domain validation happens here)
        const userToSave = User_1.User.create(dto.email, passwordHash, dto.name);
        // 4. Save user
        const savedUser = await this.userRepo.save(userToSave);
        // 5. Create tenant
        const tenantToSave = Tenant_1.Tenant.create(`${dto.email}'s Tenant`);
        const tenant = await this.tenantRepo.create(tenantToSave);
        // 6. Create default workspace
        const workspaceToSave = Workspace_1.Workspace.create(tenant.id, 'Default Workspace');
        const workspace = await this.workspaceRepo.create(workspaceToSave);
        // 7. Assign OWNER role
        const memberToSave = WorkspaceMember_1.WorkspaceMember.create(workspace.id, savedUser.id, 'OWNER');
        await this.workspaceMemberRepo.create(memberToSave);
        // 8. Generate auth token
        const token = this.tokenService.generateToken(savedUser.id, savedUser.email);
        return {
            userId: savedUser.id,
            workspaceId: workspace.id,
            token
        };
    }
}
exports.SignupUser = SignupUser;
