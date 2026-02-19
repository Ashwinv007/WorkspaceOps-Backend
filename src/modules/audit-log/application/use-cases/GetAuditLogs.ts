import { IAuditLogRepository, AuditLogFilters } from '../../domain/repositories/IAuditLogRepository';
import { AuditLog } from '../../domain/entities/AuditLog';
import { AuditLogFiltersDTO } from '../dto/AuditLogDTO';

/**
 * GetAuditLogs Use Case
 *
 * Admin-only read use case. Supports filtering by userId, action,
 * targetType, targetId, and date range, with pagination.
 */
export class GetAuditLogs {
    constructor(private readonly auditLogRepo: IAuditLogRepository) { }

    async execute(
        workspaceId: string,
        filtersDTO: AuditLogFiltersDTO
    ): Promise<{ logs: AuditLog[]; total: number }> {
        // Convert date strings to Date objects for repository layer
        const filters: AuditLogFilters = {
            userId: filtersDTO.userId,
            action: filtersDTO.action,
            targetType: filtersDTO.targetType,
            targetId: filtersDTO.targetId,
            fromDate: filtersDTO.fromDate ? new Date(filtersDTO.fromDate) : undefined,
            toDate: filtersDTO.toDate ? new Date(filtersDTO.toDate) : undefined,
            limit: filtersDTO.limit ? Number(filtersDTO.limit) : 50,
            offset: filtersDTO.offset ? Number(filtersDTO.offset) : 0,
        };

        const [logs, total] = await Promise.all([
            this.auditLogRepo.findByWorkspace(workspaceId, filters),
            this.auditLogRepo.countByWorkspace(workspaceId, filters),
        ]);

        return { logs, total };
    }
}
