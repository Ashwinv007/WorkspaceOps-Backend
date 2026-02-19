import { Request, Response, NextFunction } from 'express';
import { GetWorkspaceOverview } from '../../application/use-cases/GetWorkspaceOverview';

/**
 * OverviewController
 *
 * GET /workspaces/:workspaceId/overview
 * RBAC: MEMBER+ (enforced by middleware in route)
 */
export class OverviewController {
    constructor(private readonly getOverviewUC: GetWorkspaceOverview) {
        this.getOverview = this.getOverview.bind(this);
    }

    async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaceId = req.params.workspaceId as string;
            const userId = req.user!.userId;

            const result = await this.getOverviewUC.execute({ workspaceId, userId });
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
}
