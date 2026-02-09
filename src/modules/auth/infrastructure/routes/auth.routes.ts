import { Router } from 'express';
import { AuthController } from '../../interfaces/http/AuthController';
import { SignupUser } from '../../application/use-cases/SignupUser';
import { LoginUser } from '../../application/use-cases/LoginUser';
import { UserRepositoryImpl } from '../mongoose/UserRepositoryImpl';
import { TokenServiceImpl } from '../jwt/TokenServiceImpl';
import { UserPresenter } from '../../interfaces/presenters/UserPresenter';

// Import repository implementations
import { TenantRepositoryImpl } from '../../../workspace/infrastructure/mongoose/TenantRepositoryImpl';
import { WorkspaceRepositoryImpl } from '../../../workspace/infrastructure/mongoose/WorkspaceRepositoryImpl';
import { WorkspaceMemberRepositoryImpl } from '../../../workspace/infrastructure/mongoose/WorkspaceMemberRepositoryImpl';

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
const workspaceMemberRepo = new WorkspaceMemberRepositoryImpl();
const tokenService = new TokenServiceImpl();

// 2. Create use cases with injected dependencies
const signupUseCase = new SignupUser(
    userRepo,
    tenantRepo,
    workspaceRepo,
    workspaceMemberRepo,
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
