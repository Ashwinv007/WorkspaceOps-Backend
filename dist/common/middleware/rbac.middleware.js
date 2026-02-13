"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireMember = exports.requireAdmin = exports.requireOwner = exports.requireRole = void 0;
const WorkspaceMemberRepositoryImpl_1 = require("../../modules/workspace/infrastructure/mongoose/WorkspaceMemberRepositoryImpl");
const AppError_1 = require("../../shared/domain/errors/AppError");
/**
 * RBAC Middleware Factory
 *
 * Creates middleware that enforces role-based access control for workspace operations.
 * Verifies that the authenticated user has one of the allowed roles in the workspace.
 *
 * Usage:
 *   router.post('/workspaces/:id/members', authMiddleware, requireRole(['OWNER', 'ADMIN']), controller.inviteUser)
 *
 * Prerequisites:
 *   - Must be used AFTER authMiddleware (requires req.user to be set)
 *   - Workspace ID must be in req.params.id OR req.body.workspaceId
 */
// Create a single instance for all RBAC checks
const workspaceMemberRepo = new WorkspaceMemberRepositoryImpl_1.WorkspaceMemberRepositoryImpl();
/**
 * Factory function that returns middleware for role checking
 * @param allowedRoles - Array of roles that are permitted to access the route
 */
const requireRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            // Ensure user is authenticated
            if (!req.user) {
                throw new AppError_1.UnauthorizedError('Authentication required');
            }
            // Extract workspace ID from params or body
            const workspaceId = req.params.id || req.body.workspaceId;
            if (!workspaceId) {
                throw new AppError_1.ForbiddenError('Workspace ID not found in request');
            }
            // Get user's membership in this workspace
            const membership = await workspaceMemberRepo.findByWorkspaceIdAndUserId(workspaceId, req.user.userId);
            if (!membership) {
                throw new AppError_1.ForbiddenError('You are not a member of this workspace');
            }
            // Check if user's role is in the allowed roles
            if (!allowedRoles.includes(membership.role)) {
                throw new AppError_1.ForbiddenError(`Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${membership.role}`);
            }
            // User is authorized, proceed
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requireRole = requireRole;
/**
 * Convenience middleware for routes that require workspace ownership
 */
exports.requireOwner = (0, exports.requireRole)(['OWNER']);
/**
 * Convenience middleware for routes that require admin or owner
 */
exports.requireAdmin = (0, exports.requireRole)(['OWNER', 'ADMIN']);
/**
 * Convenience middleware for routes that require at least member access
 */
exports.requireMember = (0, exports.requireRole)(['OWNER', 'ADMIN', 'MEMBER']);
