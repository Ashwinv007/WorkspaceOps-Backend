/**
 * DTO used by AuditLogController to parse and pass query params.
 * fromDate / toDate arrive as ISO strings from HTTP, then converted to Date in the use case.
 */
export interface AuditLogFiltersDTO {
    userId?: string;      // SQL: user_id
    action?: string;      // SQL: action
    targetType?: string;  // SQL: target_type
    targetId?: string;    // SQL: target_id
    fromDate?: string;    // ISO date string from query param → converted to Date
    toDate?: string;      // ISO date string from query param → converted to Date
    limit?: number;
    offset?: number;
}
