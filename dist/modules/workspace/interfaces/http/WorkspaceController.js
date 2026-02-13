"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceController = void 0;
/**
 * Workspace Controller (Interfaces Layer)
 *
 * Handles HTTP requests for workspace operations.
 * Transforms HTTP requests into DTOs, calls use cases, and formats responses using presenter.
 */
class WorkspaceController {
    constructor(createWorkspaceUseCase, getUserWorkspacesUseCase, inviteUserUseCase, updateMemberUseCase, removeMemberUseCase, presenter) {
        this.createWorkspaceUseCase = createWorkspaceUseCase;
        this.getUserWorkspacesUseCase = getUserWorkspacesUseCase;
        this.inviteUserUseCase = inviteUserUseCase;
        this.updateMemberUseCase = updateMemberUseCase;
        this.removeMemberUseCase = removeMemberUseCase;
        this.presenter = presenter;
        /**
         * POST /workspaces
         * Create a new workspace
         */
        this.createWorkspace = async (req, res, next) => {
            try {
                const dto = {
                    tenantId: req.body.tenantId,
                    name: req.body.name,
                    createdByUserId: req.user.userId // From auth middleware
                };
                const result = await this.createWorkspaceUseCase.execute(dto);
                res.status(201).json(this.presenter.toWorkspaceResponse(result.workspace, result.membership.role));
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * GET /workspaces
         * Get all workspaces for the authenticated user
         */
        this.getUserWorkspaces = async (req, res, next) => {
            try {
                const result = await this.getUserWorkspacesUseCase.execute({
                    userId: req.user.userId
                });
                res.status(200).json(this.presenter.toWorkspaceListResponse(result));
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * POST /workspaces/:id/members
         * Invite a user to a workspace
         */
        this.inviteUser = async (req, res, next) => {
            try {
                const workspaceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const dto = {
                    workspaceId,
                    invitedUserId: req.body.invitedUserId,
                    role: req.body.role,
                    invitedByUserId: req.user.userId
                };
                const result = await this.inviteUserUseCase.execute(dto);
                res.status(201).json(this.presenter.toMemberResponse(result));
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * PUT /workspaces/:id/members/:memberId
         * Update a workspace member's role
         */
        this.updateMember = async (req, res, next) => {
            try {
                const workspaceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const memberId = Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId;
                const dto = {
                    workspaceId,
                    memberId,
                    newRole: req.body.role,
                    updatedByUserId: req.user.userId
                };
                const result = await this.updateMemberUseCase.execute(dto);
                res.status(200).json(this.presenter.toMemberResponse(result));
            }
            catch (error) {
                next(error);
            }
        };
        /**
         * DELETE /workspaces/:id/members/:memberId
         * Remove a user from a workspace
         */
        this.removeMember = async (req, res, next) => {
            try {
                const workspaceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
                const memberId = Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId;
                const dto = {
                    workspaceId,
                    memberId,
                    removedByUserId: req.user.userId
                };
                await this.removeMemberUseCase.execute(dto);
                res.status(200).json({ success: true, message: 'Member removed successfully' });
            }
            catch (error) {
                next(error);
            }
        };
    }
}
exports.WorkspaceController = WorkspaceController;
