import { Router } from 'express';
import { AuthController } from '../../interfaces/http/AuthController';
import { SignupUser } from '../../application/use-cases/SignupUser';
import { LoginUser } from '../../application/use-cases/LoginUser';
import { UserRepositoryImpl } from '../mongoose/UserRepositoryImpl';
import { TokenServiceImpl } from '../jwt/TokenServiceImpl';
import { UserPresenter } from '../../interfaces/presenters/UserPresenter';

// Import workspace repositories (temporary - will be cleaned up once workspace module is restructured)
import { TenantModel } from '../../../workspace/tenant.model';
import { WorkspaceModel } from '../../../workspace/workspace.model';
import { WorkspaceUserModel } from '../../../workspace/workspaceUser.model';

/**
 * Temporary workspace repository implementations
 * These will be moved to proper Clean Architecture structure later
 */
class TenantRepositoryImpl {
    async create(data: { name: string }) {
        const tenant = await TenantModel.create(data);
        return { id: tenant._id.toString(), name: tenant.name };
    }
}

class WorkspaceRepositoryImpl {
    async create(data: { tenantId: string; name: string }) {
        const workspace = await WorkspaceModel.create(data);
        return {
            id: workspace._id.toString(),
            tenantId: workspace.tenantId.toString(),
            name: workspace.name
        };
    }
}

class WorkspaceUserRepositoryImpl {
    async create(data: { workspaceId: string; userId: string; role: string }) {
        await WorkspaceUserModel.create(data);
    }
}

/**
 * Auth Routes (Infrastructure Layer)
 * 
 * This is where dependency injection happens manually.
 * 1. Create all implementations (repositories, services)
 * 2. Inject them into use cases
 * 3. Inject use cases into controller
 * 4. Wire up Express routes
 */
const router = Router();

// 1. Create infrastructure implementations
const userRepo = new UserRepositoryImpl();
const tenantRepo = new TenantRepositoryImpl();
const workspaceRepo = new WorkspaceRepositoryImpl();
const workspaceUserRepo = new WorkspaceUserRepositoryImpl();
const tokenService = new TokenServiceImpl();

// 2. Create use cases with injected dependencies
const signupUseCase = new SignupUser(
    userRepo,
    tenantRepo,
    workspaceRepo,
    workspaceUserRepo,
    tokenService
);

const loginUseCase = new LoginUser(userRepo, tokenService);

// 3. Create presenter
const presenter = new UserPresenter();

// 4. Create controller with injected use cases
const authController = new AuthController(signupUseCase, loginUseCase, presenter);

// 5. Define routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);

export default router;
