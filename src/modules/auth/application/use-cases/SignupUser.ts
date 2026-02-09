import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { ITokenService } from '../services/ITokenService';
import { SignupDTO, SignupResponseDTO } from '../dto/SignupDTO';
import { User } from '../../domain/entities/User';
import { AppError } from '../../../../shared/domain/errors/AppError';

// Workspace repository interfaces (will be created later)
interface ITenantRepository {
    create(data: { name: string }): Promise<{ id: string; name: string }>;
}

interface IWorkspaceRepository {
    create(data: { tenantId: string; name: string }): Promise<{ id: string; tenantId: string; name: string }>;
}

interface IWorkspaceUserRepository {
    create(data: { workspaceId: string; userId: string; role: string }): Promise<void>;
}

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
export class SignupUser {
    constructor(
        private readonly userRepo: IUserRepository,
        private readonly tenantRepo: ITenantRepository,
        private readonly workspaceRepo: IWorkspaceRepository,
        private readonly workspaceUserRepo: IWorkspaceUserRepository,
        private readonly tokenService: ITokenService
    ) { }

    async execute(dto: SignupDTO): Promise<SignupResponseDTO> {
        // 1. Check if user already exists
        const existingUser = await this.userRepo.findByEmail(dto.email);
        if (existingUser) {
            throw new AppError('User with this email already exists', 400);
        }

        // 2. Hash password
        const passwordHash = await this.tokenService.hashPassword(dto.password);

        // 3. Create user entity (domain validation happens here)
        const userToSave = User.create(dto.email, passwordHash, dto.name);

        // 4. Save user
        const savedUser = await this.userRepo.save(userToSave);

        // 5. Create tenant
        const tenant = await this.tenantRepo.create({
            name: `${dto.email}'s Tenant`
        });

        // 6. Create default workspace
        const workspace = await this.workspaceRepo.create({
            tenantId: tenant.id,
            name: 'Default Workspace'
        });

        // 7. Assign OWNER role
        await this.workspaceUserRepo.create({
            workspaceId: workspace.id,
            userId: savedUser.id,
            role: 'OWNER'
        });

        // 8. Generate auth token
        const token = this.tokenService.generateToken(savedUser.id, savedUser.email);

        return {
            userId: savedUser.id,
            workspaceId: workspace.id,
            token
        };
    }
}
