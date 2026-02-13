import { WorkspaceMember } from '../entities/WorkspaceMember';

export interface IWorkspaceMemberRepository {
    create(member: Omit<WorkspaceMember, 'id' | 'createdAt'>): Promise<WorkspaceMember>;
    findByWorkspaceIdAndUserId(workspaceId: string, userId: string): Promise<WorkspaceMember | null>;
    findByUserId(userId: string): Promise<WorkspaceMember[]>;
    findByWorkspaceId(workspaceId: string): Promise<WorkspaceMember[]>;
    update(id: string, data: Partial<WorkspaceMember>): Promise<WorkspaceMember>;
    delete(id: string): Promise<void>;
}
