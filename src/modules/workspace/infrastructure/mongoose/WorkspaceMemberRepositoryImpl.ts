import { IWorkspaceMemberRepository } from '../../domain/repositories/IWorkspaceMemberRepository';
import { WorkspaceMember, WorkspaceRole } from '../../domain/entities/WorkspaceMember';
import { WorkspaceMemberModel } from './WorkspaceMemberModel';

export class WorkspaceMemberRepositoryImpl implements IWorkspaceMemberRepository {
    async create(member: Omit<WorkspaceMember, 'id' | 'createdAt'>): Promise<WorkspaceMember> {
        const doc = await WorkspaceMemberModel.create({
            workspaceId: member.workspaceId,
            userId: member.userId,
            role: member.role
        });
        return this.toDomain(doc);
    }

    async findByWorkspaceIdAndUserId(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
        const doc = await WorkspaceMemberModel.findOne({ workspaceId, userId });
        if (!doc) return null;
        return this.toDomain(doc);
    }

    private toDomain(doc: any): WorkspaceMember {
        return new WorkspaceMember(
            doc._id.toString(),
            doc.workspaceId,
            doc.userId,
            doc.role as WorkspaceRole,
            doc.createdAt
        );
    }
}
