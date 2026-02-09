import { Workspace } from '../entities/Workspace';

export interface IWorkspaceRepository {
    create(workspace: Omit<Workspace, 'id' | 'createdAt'>): Promise<Workspace>;
    findById(id: string): Promise<Workspace | null>;
    findByTenantId(tenantId: string): Promise<Workspace[]>;
}
