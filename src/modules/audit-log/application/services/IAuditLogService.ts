import { AuditAction } from '../../domain/enums/AuditAction';

/**
 * DTO for creating an audit log entry.
 * Used by all module use cases when calling auditLogService.log().
 */
export interface CreateAuditLogDTO {
    workspaceId: string;
    userId: string;       // SQL: user_id — who performed the action
    action: AuditAction;
    targetType: string;   // SQL: target_type — e.g. 'WorkItem', 'Entity', 'Document'
    targetId?: string;    // SQL: target_id — nullable, ID of the affected record
}

export interface IAuditLogService {
    /**
     * Records an audit event. MUST NEVER throw — failures are swallowed silently
     * so the calling use case is never blocked by audit failures.
     */
    log(dto: CreateAuditLogDTO): Promise<void>;
}
