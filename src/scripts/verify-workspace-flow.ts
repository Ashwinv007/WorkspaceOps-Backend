
import mongoose from 'mongoose';
import { env } from '../config/env';
import { SignupUser } from '../modules/auth/application/use-cases/SignupUser';
import { UserRepositoryImpl } from '../modules/auth/infrastructure/mongoose/UserRepositoryImpl';
import { TenantRepositoryImpl } from '../modules/workspace/infrastructure/mongoose/TenantRepositoryImpl';
import { WorkspaceRepositoryImpl } from '../modules/workspace/infrastructure/mongoose/WorkspaceRepositoryImpl';
import { WorkspaceMemberRepositoryImpl } from '../modules/workspace/infrastructure/mongoose/WorkspaceMemberRepositoryImpl';
import { TokenServiceImpl } from '../modules/auth/infrastructure/jwt/TokenServiceImpl';

async function main() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(env.mongoUri);
    console.log('Connected.');

    const userRepo = new UserRepositoryImpl();
    const tenantRepo = new TenantRepositoryImpl();
    const workspaceRepo = new WorkspaceRepositoryImpl();
    const workspaceMemberRepo = new WorkspaceMemberRepositoryImpl();
    const tokenService = new TokenServiceImpl();

    const signupUseCase = new SignupUser(
        userRepo,
        tenantRepo,
        workspaceRepo,
        workspaceMemberRepo,
        tokenService
    );

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

    } catch (error) {
        console.error('Signup failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

main().catch(console.error);
