import { Request, Response, NextFunction } from 'express';
import { WorkspaceRole } from '../../modules/workspace/domain/entities/WorkspaceMember';
import { WorkspaceMemberRepositoryImpl } from '../../modules/workspace/infrastructure/mongoose/WorkspaceMemberRepositoryImpl';
import { ForbiddenError, UnauthorizedError } from '../../shared/domain/errors/AppError';

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
const workspaceMemberRepo = new WorkspaceMemberRepositoryImpl();

/**
 * Factory function that returns middleware for role checking
 * @param allowedRoles - Array of roles that are permitted to access the route
 */
export const requireRole = (allowedRoles: WorkspaceRole[]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // Ensure user is authenticated
            if (!req.user) {
                throw new UnauthorizedError('Authentication required');
            }

            // Extract workspace ID from params or body
            // Support both 'id' and 'workspaceId' parameter names
            const workspaceId = req.params.workspaceId || req.params.id || req.body.workspaceId;

            if (!workspaceId) {
                throw new ForbiddenError('Workspace ID not found in request');
            }

            // Get user's membership in this workspace
            const membership = await workspaceMemberRepo.findByWorkspaceIdAndUserId(
                workspaceId,
                req.user.userId
            );

            if (!membership) {
                throw new ForbiddenError('You are not a member of this workspace');
            }

            // Check if user's role is in the allowed roles
            if (!allowedRoles.includes(membership.role)) {
                throw new ForbiddenError(
                    `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${membership.role}`
                );
            }

            // User is authorized, proceed
            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Convenience middleware for routes that require workspace ownership
 */
export const requireOwner = requireRole(['OWNER']);

/**
 * Convenience middleware for routes that require admin or owner
 */
export const requireAdmin = requireRole(['OWNER', 'ADMIN']);

/**
 * Convenience middleware for routes that require at least member access
 */
export const requireMember = requireRole(['OWNER', 'ADMIN', 'MEMBER']);
