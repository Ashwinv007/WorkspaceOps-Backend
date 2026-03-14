import { Request, Response, NextFunction } from 'express';
import { GetAuditLogs } from '../../application/use-cases/GetAuditLogs';
import { AuditLogPresenter } from '../presenters/AuditLogPresenter';
import { AuditLogFiltersDTO } from '../../application/dto/AuditLogDTO';
import { IUserRepository } from '../../../auth/domain/repositories/IUserRepository';

/**
 * AuditLogController
 *
 * Handles HTTP requests for the audit log module.
 * Single endpoint: GET /workspaces/:workspaceId/audit-logs (Admin only)
 */
export class AuditLogController {
    constructor(
        private readonly getAuditLogsUC: GetAuditLogs,
        private readonly presenter: AuditLogPresenter,
        private readonly userRepo: IUserRepository
    ) {
        this.getAuditLogs = this.getAuditLogs.bind(this);
    }

    /**
     * GET /workspaces/:workspaceId/audit-logs
     * Query params: userId, action, targetType, targetId, fromDate, toDate, limit, offset
     * RBAC: Admin only (enforced by middleware in route)
     */
    async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaceId = req.params.workspaceId as string;

            // Helper: only accept single-value query params (ignore arrays)
            const qs = (key: string): string | undefined => {
                const v = req.query[key];
                return typeof v === 'string' ? v : undefined;
            };

            const limitStr = qs('limit');
            const offsetStr = qs('offset');

            const filtersDTO: AuditLogFiltersDTO = {
                userId: qs('userId'),
                action: qs('action'),
                targetType: qs('targetType'),
                targetId: qs('targetId'),
                fromDate: qs('fromDate'),
                toDate: qs('toDate'),
                limit: limitStr ? Number(limitStr) : undefined,
                offset: offsetStr ? Number(offsetStr) : undefined,
            };

            const result = await this.getAuditLogsUC.execute(workspaceId, filtersDTO);

            const userIds = [...new Set(result.logs.map(l => l.userId))];
            const users = await this.userRepo.findManyByIds(userIds);
            const userMap = new Map(users.map(u => [u.id, u]));

            res.status(200).json(this.presenter.presentAuditLogs(result, filtersDTO, userMap));
        } catch (error) {
            next(error);
        }
    }
}
