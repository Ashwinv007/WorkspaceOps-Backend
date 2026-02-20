import { Request, Response, NextFunction } from 'express';
import { CreateWorkspace, CreateWorkspaceDTO } from '../../application/use-cases/CreateWorkspace';
import { GetUserWorkspaces } from '../../application/use-cases/GetUserWorkspaces';
import { InviteUserToWorkspace, InviteUserToWorkspaceDTO } from '../../application/use-cases/InviteUserToWorkspace';
import { UpdateWorkspaceMember, UpdateWorkspaceMemberDTO } from '../../application/use-cases/UpdateWorkspaceMember';
import { RemoveUserFromWorkspace, RemoveUserFromWorkspaceDTO } from '../../application/use-cases/RemoveUserFromWorkspace';
import { WorkspacePresenter } from '../presenters/WorkspacePresenter';

/**
 * Workspace Controller (Interfaces Layer)
 * 
 * Handles HTTP requests for workspace operations.
 * Transforms HTTP requests into DTOs, calls use cases, and formats responses using presenter.
 */
export class WorkspaceController {
    constructor(
        private readonly createWorkspaceUseCase: CreateWorkspace,
        private readonly getUserWorkspacesUseCase: GetUserWorkspaces,
        private readonly inviteUserUseCase: InviteUserToWorkspace,
        private readonly updateMemberUseCase: UpdateWorkspaceMember,
        private readonly removeMemberUseCase: RemoveUserFromWorkspace,
        private readonly presenter: WorkspacePresenter
    ) { }

    /**
     * POST /workspaces
     * Create a new workspace
     */
    createWorkspace = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const dto: CreateWorkspaceDTO = {
                tenantId: req.body.tenantId,
                name: req.body.name,
                createdByUserId: req.user!.userId // From auth middleware
            };

            const result = await this.createWorkspaceUseCase.execute(dto);
            res.status(201).json(this.presenter.toWorkspaceResponse(result.workspace, result.membership.role));
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /workspaces
     * Get all workspaces for the authenticated user
     */
    getUserWorkspaces = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.getUserWorkspacesUseCase.execute({
                userId: req.user!.userId
            });

            res.status(200).json(this.presenter.toWorkspaceListResponse(result));
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /workspaces/:id/members
     * Invite a user to a workspace
     */
    inviteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const workspaceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

            const dto: InviteUserToWorkspaceDTO = {
                workspaceId,
                invitedEmail: req.body.invitedEmail,
                role: req.body.role,
                invitedByUserId: req.user!.userId
            };

            const result = await this.inviteUserUseCase.execute(dto);
            res.status(201).json(this.presenter.toMemberResponse(result));
        } catch (error) {
            next(error);
        }
    };

    /**
     * PUT /workspaces/:id/members/:memberId
     * Update a workspace member's role
     */
    updateMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const workspaceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const memberId = Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId;

            const dto: UpdateWorkspaceMemberDTO = {
                workspaceId,
                memberId,
                newRole: req.body.role,
                updatedByUserId: req.user!.userId
            };

            const result = await this.updateMemberUseCase.execute(dto);
            res.status(200).json(this.presenter.toMemberResponse(result));
        } catch (error) {
            next(error);
        }
    };

    /**
     * DELETE /workspaces/:id/members/:memberId
     * Remove a user from a workspace
     */
    removeMember = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const workspaceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const memberId = Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId;

            const dto: RemoveUserFromWorkspaceDTO = {
                workspaceId,
                memberId,
                removedByUserId: req.user!.userId
            };

            await this.removeMemberUseCase.execute(dto);
            res.status(200).json({ success: true, message: 'Member removed successfully' });
        } catch (error) {
            next(error);
        }
    };
}
