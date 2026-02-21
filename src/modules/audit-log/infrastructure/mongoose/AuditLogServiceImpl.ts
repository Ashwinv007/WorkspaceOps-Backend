import { IAuditLogService, CreateAuditLogDTO } from '../../application/services/IAuditLogService';
import { RecordAudit } from '../../application/use-cases/RecordAudit';
import { AuditAction } from '../../domain/enums/AuditAction';
import { socketEventEmitter } from '../../../../infrastructure/socket/SocketEventEmitter';

/**
 * AuditLogServiceImpl
 *
 * Concrete implementation of IAuditLogService.
 * Wraps RecordAudit use case with silent error handling — audit failures
 * must NEVER propagate to the calling use case.
 *
 * Also emits Socket.io events for scoped real-time updates after a
 * successful audit log write. The mapping covers only the 8 critical events.
 * Socket emission is fire-and-forget — it never blocks or throws.
 */
export class AuditLogServiceImpl implements IAuditLogService {
    constructor(private readonly recordAuditUC: RecordAudit) { }

    async log(dto: CreateAuditLogDTO): Promise<void> {
        try {
            await this.recordAuditUC.execute(dto);
            // Emit real-time event for scoped actions (fire-and-forget)
            const socketEvent = this.toSocketEvent(dto.action);
            if (socketEvent) {
                socketEventEmitter.emit(dto.workspaceId, socketEvent, {
                    targetId: dto.targetId,
                    targetType: dto.targetType,
                    workspaceId: dto.workspaceId,
                });
            }
        } catch (error) {
            // Silent failure — audit log must NEVER block the main operation
            console.error('[AuditLog] Failed to record audit log:', error);
        }
    }

    /**
     * Maps AuditAction to a Socket.io event name.
     * Returns null for actions that don't need real-time broadcasting.
     */
    private toSocketEvent(action: AuditAction): string | null {
        const map: Partial<Record<AuditAction, string>> = {
            [AuditAction.WORK_ITEM_STATUS_CHANGED]:      'work-item:status-changed',
            [AuditAction.WORK_ITEM_DOCUMENT_LINKED]:     'work-item:document-linked',
            [AuditAction.WORK_ITEM_DOCUMENT_UNLINKED]:   'work-item:document-unlinked',
            [AuditAction.DOCUMENT_UPLOADED]:             'document:uploaded',
            [AuditAction.DOCUMENT_DELETED]:              'document:deleted',
            [AuditAction.WORKSPACE_MEMBER_INVITED]:      'workspace:member-invited',
            [AuditAction.WORKSPACE_MEMBER_ROLE_UPDATED]: 'workspace:member-updated',
            [AuditAction.WORKSPACE_MEMBER_REMOVED]:      'workspace:member-removed',
        };
        return map[action] ?? null;
    }
}
