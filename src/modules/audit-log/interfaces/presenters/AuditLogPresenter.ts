import { AuditLog } from '../../domain/entities/AuditLog';
import { AuditLogFiltersDTO } from '../../application/dto/AuditLogDTO';

/**
 * AuditLogPresenter
 *
 * Formats AuditLog domain entities into API response objects.
 */
export class AuditLogPresenter {

    presentAuditLog(log: AuditLog) {
        return {
            id: log.id,
            workspaceId: log.workspaceId,
            userId: log.userId,
            action: log.action,
            targetType: log.targetType,
            targetId: log.targetId ?? null,
            createdAt: log.createdAt,
        };
    }

    presentAuditLogs(
        result: { logs: AuditLog[]; total: number },
        filters: AuditLogFiltersDTO
    ) {
        return {
            total: result.total,
            limit: filters.limit ?? 50,
            offset: filters.offset ?? 0,
            logs: result.logs.map((log) => this.presentAuditLog(log)),
        };
    }
}
