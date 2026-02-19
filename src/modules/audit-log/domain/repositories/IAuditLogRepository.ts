import { AuditLog } from '../entities/AuditLog';

export interface AuditLogFilters {
    userId?: string;      // SQL: user_id
    action?: string;      // SQL: action
    targetType?: string;  // SQL: target_type
    targetId?: string;    // SQL: target_id
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
}

export interface IAuditLogRepository {
    create(log: Omit<AuditLog, 'id'>): Promise<AuditLog>;
    findByWorkspace(workspaceId: string, filters?: AuditLogFilters): Promise<AuditLog[]>;
    countByWorkspace(workspaceId: string, filters?: AuditLogFilters): Promise<number>;
}
