import { IWorkItemRepository } from '../../domain/repositories/IWorkItemRepository';
import { WorkItem } from '../../domain/entities/WorkItem';
import { WorkItemStatus } from '../../domain/enums/WorkItemStatus';
import { WorkItemModel } from './WorkItemModel';

/**
 * WorkItem Repository Implementation (Mongoose)
 */
export class WorkItemRepositoryImpl implements IWorkItemRepository {

    private toDomain(mongoDoc: any): WorkItem {
        return new WorkItem(
            mongoDoc._id.toString(),
            mongoDoc.workspaceId.toString(),
            mongoDoc.workItemTypeId.toString(),
            mongoDoc.entityId.toString(),
            mongoDoc.assignedToUserId.toString(),
            mongoDoc.title,
            mongoDoc.status as WorkItemStatus,
            mongoDoc.createdAt,
            mongoDoc.updatedAt,
            mongoDoc.description,
            mongoDoc.priority,
            mongoDoc.dueDate
        );
    }

    async create(item: Omit<WorkItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkItem> {
        const mongoDoc = await WorkItemModel.create({
            workspaceId: item.workspaceId,
            workItemTypeId: item.workItemTypeId,
            entityId: item.entityId,
            assignedToUserId: item.assignedToUserId,
            title: item.title,
            description: item.description,
            status: item.status,
            priority: item.priority,
            dueDate: item.dueDate
        });
        return this.toDomain(mongoDoc);
    }

    async findById(id: string, workspaceId: string): Promise<WorkItem | null> {
        const mongoDoc = await WorkItemModel.findOne({ _id: id, workspaceId });
        return mongoDoc ? this.toDomain(mongoDoc) : null;
    }

    async findByWorkspace(
        workspaceId: string,
        filters?: {
            status?: WorkItemStatus;
            workItemTypeId?: string;
            entityId?: string;
            assignedToUserId?: string;
            priority?: string;
        }
    ): Promise<WorkItem[]> {
        const query: any = { workspaceId };

        if (filters) {
            if (filters.status) query.status = filters.status;
            if (filters.workItemTypeId) query.workItemTypeId = filters.workItemTypeId;
            if (filters.entityId) query.entityId = filters.entityId;
            if (filters.assignedToUserId) query.assignedToUserId = filters.assignedToUserId;
            if (filters.priority) query.priority = filters.priority;
        }

        const mongoDocs = await WorkItemModel.find(query).sort({ createdAt: -1 });
        return mongoDocs.map(doc => this.toDomain(doc));
    }

    async findByEntity(entityId: string, workspaceId: string): Promise<WorkItem[]> {
        const mongoDocs = await WorkItemModel.find({ entityId, workspaceId }).sort({ createdAt: -1 });
        return mongoDocs.map(doc => this.toDomain(doc));
    }

    async update(
        id: string,
        workspaceId: string,
        updates: {
            title?: string;
            description?: string;
            priority?: string;
            dueDate?: Date;
            entityId?: string;
        }
    ): Promise<WorkItem | null> {
        const mongoDoc = await WorkItemModel.findOneAndUpdate(
            { _id: id, workspaceId },
            { $set: updates },
            { new: true }
        );
        return mongoDoc ? this.toDomain(mongoDoc) : null;
    }

    async updateStatus(id: string, workspaceId: string, status: WorkItemStatus): Promise<WorkItem | null> {
        const mongoDoc = await WorkItemModel.findOneAndUpdate(
            { _id: id, workspaceId },
            { $set: { status } },
            { new: true }
        );
        return mongoDoc ? this.toDomain(mongoDoc) : null;
    }

    async delete(id: string, workspaceId: string): Promise<boolean> {
        const result = await WorkItemModel.deleteOne({ _id: id, workspaceId });
        return result.deletedCount > 0;
    }

    async countByWorkspace(workspaceId: string): Promise<number> {
        return WorkItemModel.countDocuments({ workspaceId });
    }
}
