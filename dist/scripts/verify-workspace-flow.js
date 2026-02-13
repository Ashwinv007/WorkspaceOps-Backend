"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("../config/env");
const SignupUser_1 = require("../modules/auth/application/use-cases/SignupUser");
const UserRepositoryImpl_1 = require("../modules/auth/infrastructure/mongoose/UserRepositoryImpl");
const TenantRepositoryImpl_1 = require("../modules/workspace/infrastructure/mongoose/TenantRepositoryImpl");
const WorkspaceRepositoryImpl_1 = require("../modules/workspace/infrastructure/mongoose/WorkspaceRepositoryImpl");
const WorkspaceMemberRepositoryImpl_1 = require("../modules/workspace/infrastructure/mongoose/WorkspaceMemberRepositoryImpl");
const TokenServiceImpl_1 = require("../modules/auth/infrastructure/jwt/TokenServiceImpl");
async function main() {
    console.log('Connecting to MongoDB...');
    await mongoose_1.default.connect(env_1.env.mongoUri);
    console.log('Connected.');
    const userRepo = new UserRepositoryImpl_1.UserRepositoryImpl();
    const tenantRepo = new TenantRepositoryImpl_1.TenantRepositoryImpl();
    const workspaceRepo = new WorkspaceRepositoryImpl_1.WorkspaceRepositoryImpl();
    const workspaceMemberRepo = new WorkspaceMemberRepositoryImpl_1.WorkspaceMemberRepositoryImpl();
    const tokenService = new TokenServiceImpl_1.TokenServiceImpl();
    const signupUseCase = new SignupUser_1.SignupUser(userRepo, tenantRepo, workspaceRepo, workspaceMemberRepo, tokenService);
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'Password123!';
    console.log(`Signing up user with email: ${testEmail}`);
    try {
        const result = await signupUseCase.execute({
            email: testEmail,
            password: testPassword,
            name: 'Test Verify User'
        });
        console.log('Signup successful!');
        console.log('Result:', JSON.stringify(result, null, 2));
        // Verification checks
        const user = await userRepo.findByEmail(testEmail);
        console.log('User found:', !!user);
        const workspace = await workspaceRepo.findById(result.workspaceId);
        console.log('Workspace found:', !!workspace);
        if (workspace) {
            const tenant = await tenantRepo.findById(workspace.tenantId);
            console.log('Tenant found:', !!tenant);
        }
        if (user && workspace) {
            const member = await workspaceMemberRepo.findByWorkspaceIdAndUserId(workspace.id, user.id);
            console.log('Member found:', !!member);
            console.log('Member role:', member?.role);
        }
    }
    catch (error) {
        console.error('Signup failed:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('Disconnected.');
    }
}
main().catch(console.error);
