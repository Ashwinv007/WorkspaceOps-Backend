import { IWorkItemTypeRepository } from '../../domain/repositories/IWorkItemTypeRepository';
import { WorkItemType } from '../../domain/entities/WorkItemType';
import { WorkItemTypeModel } from './WorkItemTypeModel';

/**
 * WorkItemType Repository Implementation (Mongoose)
 */
export class WorkItemTypeRepositoryImpl implements IWorkItemTypeRepository {

    private toDomain(mongoDoc: any): WorkItemType {
        return new WorkItemType(
            mongoDoc._id.toString(),
            mongoDoc.workspaceId.toString(),
            mongoDoc.name,
            mongoDoc.createdAt,
            mongoDoc.description,
            mongoDoc.entityType
        );
    }

    async create(type: Omit<WorkItemType, 'id' | 'createdAt'>): Promise<WorkItemType> {
        const mongoDoc = await WorkItemTypeModel.create({
            workspaceId: type.workspaceId,
            name: type.name,
            description: type.description,
            entityType: type.entityType
        });
        return this.toDomain(mongoDoc);
    }

    async findById(id: string, workspaceId: string): Promise<WorkItemType | null> {
        const mongoDoc = await WorkItemTypeModel.findOne({ _id: id, workspaceId });
        return mongoDoc ? this.toDomain(mongoDoc) : null;
    }

    async findByWorkspace(workspaceId: string): Promise<WorkItemType[]> {
        const mongoDocs = await WorkItemTypeModel.find({ workspaceId }).sort({ name: 1 });
        return mongoDocs.map(doc => this.toDomain(doc));
    }

    async findByName(name: string, workspaceId: string): Promise<WorkItemType | null> {
        const mongoDoc = await WorkItemTypeModel.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') },
            workspaceId
        });
        return mongoDoc ? this.toDomain(mongoDoc) : null;
    }

    async delete(id: string, workspaceId: string): Promise<boolean> {
        const result = await WorkItemTypeModel.deleteOne({ _id: id, workspaceId });
        return result.deletedCount > 0;
    }

    async countByWorkspace(workspaceId: string): Promise<number> {
        return WorkItemTypeModel.countDocuments({ workspaceId });
    }
}
