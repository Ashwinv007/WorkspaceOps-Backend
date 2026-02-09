"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthController_1 = require("../../interfaces/http/AuthController");
const SignupUser_1 = require("../../application/use-cases/SignupUser");
const LoginUser_1 = require("../../application/use-cases/LoginUser");
const UserRepositoryImpl_1 = require("../mongoose/UserRepositoryImpl");
const TokenServiceImpl_1 = require("../jwt/TokenServiceImpl");
const UserPresenter_1 = require("../../interfaces/presenters/UserPresenter");
// Import repository implementations
const TenantRepositoryImpl_1 = require("../../../workspace/infrastructure/mongoose/TenantRepositoryImpl");
const WorkspaceRepositoryImpl_1 = require("../../../workspace/infrastructure/mongoose/WorkspaceRepositoryImpl");
const WorkspaceMemberRepositoryImpl_1 = require("../../../workspace/infrastructure/mongoose/WorkspaceMemberRepositoryImpl");
/**
 * Auth Routes (Infrastructure Layer)
 *
 * This is where dependency injection happens manually.
 * 1. Create all implementations (repositories, services)
 * 2. Inject them into use cases
 * 3. Inject use cases into controller
 * 4. Wire up Express routes
 */
const router = (0, express_1.Router)();
// 1. Create infrastructure implementations
const userRepo = new UserRepositoryImpl_1.UserRepositoryImpl();
const tenantRepo = new TenantRepositoryImpl_1.TenantRepositoryImpl();
const workspaceRepo = new WorkspaceRepositoryImpl_1.WorkspaceRepositoryImpl();
const workspaceMemberRepo = new WorkspaceMemberRepositoryImpl_1.WorkspaceMemberRepositoryImpl();
const tokenService = new TokenServiceImpl_1.TokenServiceImpl();
// 2. Create use cases with injected dependencies
const signupUseCase = new SignupUser_1.SignupUser(userRepo, tenantRepo, workspaceRepo, workspaceMemberRepo, tokenService);
const loginUseCase = new LoginUser_1.LoginUser(userRepo, tokenService);
// 3. Create presenter
const presenter = new UserPresenter_1.UserPresenter();
// 4. Create controller with injected use cases
const authController = new AuthController_1.AuthController(signupUseCase, loginUseCase, presenter);
// 5. Define routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
exports.default = router;
