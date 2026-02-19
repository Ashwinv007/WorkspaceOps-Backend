import { IAuditLogService, CreateAuditLogDTO } from '../../application/services/IAuditLogService';
import { RecordAudit } from '../../application/use-cases/RecordAudit';

/**
 * AuditLogServiceImpl
 *
 * Concrete implementation of IAuditLogService.
 * Wraps RecordAudit use case with silent error handling — audit failures
 * must NEVER propagate to the calling use case.
 */
export class AuditLogServiceImpl implements IAuditLogService {
    constructor(private readonly recordAuditUC: RecordAudit) { }

    async log(dto: CreateAuditLogDTO): Promise<void> {
        try {
            await this.recordAuditUC.execute(dto);
        } catch (error) {
            // Silent failure — audit log must NEVER block the main operation
            console.error('[AuditLog] Failed to record audit log:', error);
        }
    }
}
