import { IAuditLogRepository, AuditLogFilters } from '../../domain/repositories/IAuditLogRepository';
import { AuditLog } from '../../domain/entities/AuditLog';
import { AuditLogModel } from './AuditLogModel';
import { AuditAction } from '../../domain/enums/AuditAction';

export class AuditLogRepositoryImpl implements IAuditLogRepository {
    async create(log: Omit<AuditLog, 'id'>): Promise<AuditLog> {
        const doc = await AuditLogModel.create({
            workspaceId: log.workspaceId,
            userId: log.userId,
            action: log.action,
            targetType: log.targetType,
            targetId: log.targetId,
        });
        return this.toEntity(doc);
    }

    async findByWorkspace(workspaceId: string, filters?: AuditLogFilters): Promise<AuditLog[]> {
        const query = this.buildQuery(workspaceId, filters);
        const docs = await AuditLogModel
            .find(query)
            .sort({ createdAt: -1 })
            .skip(filters?.offset ?? 0)
            .limit(filters?.limit ?? 50);
        return docs.map((doc) => this.toEntity(doc));
    }

    async countByWorkspace(workspaceId: string, filters?: AuditLogFilters): Promise<number> {
        const query = this.buildQuery(workspaceId, filters);
        return AuditLogModel.countDocuments(query);
    }

    private buildQuery(workspaceId: string, filters?: AuditLogFilters): Record<string, any> {
        const query: Record<string, any> = { workspaceId };

        if (filters?.userId) query.userId = filters.userId;
        if (filters?.action) query.action = filters.action;
        if (filters?.targetType) query.targetType = filters.targetType;
        if (filters?.targetId) query.targetId = filters.targetId;

        if (filters?.fromDate || filters?.toDate) {
            query.createdAt = {};
            if (filters.fromDate) query.createdAt.$gte = filters.fromDate;
            if (filters.toDate) query.createdAt.$lte = filters.toDate;
        }

        return query;
    }

    private toEntity(doc: any): AuditLog {
        return new AuditLog(
            doc._id.toString(),
            doc.workspaceId.toString(),
            doc.userId.toString(),
            doc.action as AuditAction,
            doc.targetType,
            doc.targetId ?? undefined,
            doc.createdAt,
        );
    }
}
