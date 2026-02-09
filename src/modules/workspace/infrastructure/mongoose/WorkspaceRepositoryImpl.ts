import { IWorkspaceRepository } from '../../domain/repositories/IWorkspaceRepository';
import { Workspace } from '../../domain/entities/Workspace';
import { WorkspaceModel } from './WorkspaceModel';

export class WorkspaceRepositoryImpl implements IWorkspaceRepository {
    async create(workspace: Omit<Workspace, 'id' | 'createdAt'>): Promise<Workspace> {
        const doc = await WorkspaceModel.create({
            tenantId: workspace.tenantId,
            name: workspace.name
        });
        return this.toDomain(doc);
    }

    async findById(id: string): Promise<Workspace | null> {
        const doc = await WorkspaceModel.findById(id);
        if (!doc) return null;
        return this.toDomain(doc);
    }

    async findByTenantId(tenantId: string): Promise<Workspace[]> {
        const docs = await WorkspaceModel.find({ tenantId });
        return docs.map(doc => this.toDomain(doc));
    }

    private toDomain(doc: any): Workspace {
        return new Workspace(
            doc._id.toString(),
            doc.tenantId,
            doc.name,
            doc.createdAt
        );
    }
}
