import { AuditLog } from '../../domain/entities/AuditLog';
import { AuditLogFiltersDTO } from '../../application/dto/AuditLogDTO';
import { User } from '../../../auth/domain/entities/User';

/**
 * AuditLogPresenter
 *
 * Formats AuditLog domain entities into API response objects.
 */
export class AuditLogPresenter {

    presentAuditLog(log: AuditLog, userMap?: Map<string, User>) {
        const user = userMap?.get(log.userId);
        return {
            id: log.id,
            workspaceId: log.workspaceId,
            userId: log.userId,
            userEmail: user?.email ?? null,
            userName: user?.name ?? null,
            action: log.action,
            targetType: log.targetType,
            targetId: log.targetId ?? null,
            createdAt: log.createdAt,
        };
    }

    presentAuditLogs(
        result: { logs: AuditLog[]; total: number },
        filters: AuditLogFiltersDTO,
        userMap?: Map<string, User>
    ) {
        return {
            total: result.total,
            limit: filters.limit ?? 50,
            offset: filters.offset ?? 0,
            logs: result.logs.map((log) => this.presentAuditLog(log, userMap)),
        };
    }
}
