import { AuditAction } from '../enums/AuditAction';

/**
 * AuditLog Domain Entity
 *
 * Represents a single audit event recorded in the system.
 *
 * SQL schema mapping (audit_logs table):
 * {
 *   id          → id (string, MongoDB ObjectId)
 *   workspace_id → workspaceId (string)
 *   user_id      → userId (string) — the actor who performed the action
 *   action       → action (AuditAction enum)
 *   target_type  → targetType (string) — e.g. 'WorkItem', 'Entity', 'Document'
 *   target_id    → targetId (string | undefined) — nullable in SQL
 *   created_at   → createdAt (Date)
 * }
 */
export class AuditLog {
    constructor(
        public readonly id: string,
        public readonly workspaceId: string,
        public readonly userId: string,               // SQL: user_id
        public readonly action: AuditAction,           // SQL: action VARCHAR(100)
        public readonly targetType: string,            // SQL: target_type VARCHAR(50)
        public readonly targetId: string | undefined,  // SQL: target_id UUID (nullable)
        public readonly createdAt: Date                // SQL: created_at
    ) { }
}
