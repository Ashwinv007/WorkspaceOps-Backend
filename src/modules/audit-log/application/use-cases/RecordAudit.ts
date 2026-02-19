import { IAuditLogRepository } from '../../domain/repositories/IAuditLogRepository';
import { CreateAuditLogDTO } from '../services/IAuditLogService';
import { AuditLog } from '../../domain/entities/AuditLog';

/**
 * RecordAudit Use Case
 *
 * Internal write use case invoked by AuditLogServiceImpl.
 * Called after a successful write operation in any module use case.
 */
export class RecordAudit {
    constructor(private readonly auditLogRepo: IAuditLogRepository) { }

    async execute(dto: CreateAuditLogDTO): Promise<AuditLog> {
        return this.auditLogRepo.create({
            workspaceId: dto.workspaceId,
            userId: dto.userId,
            action: dto.action,
            targetType: dto.targetType,
            targetId: dto.targetId,
            createdAt: new Date(),
        });
    }
}
