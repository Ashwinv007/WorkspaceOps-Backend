import { WorkspaceMember } from '../entities/WorkspaceMember';

export interface IWorkspaceMemberRepository {
    create(member: Omit<WorkspaceMember, 'id' | 'createdAt'>): Promise<WorkspaceMember>;
    findByWorkspaceIdAndUserId(workspaceId: string, userId: string): Promise<WorkspaceMember | null>;
}
