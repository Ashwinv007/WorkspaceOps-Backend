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

    async findByUserId(userId: string): Promise<WorkspaceMember[]> {
        const docs = await WorkspaceMemberModel.find({ userId });
        return docs.map(doc => this.toDomain(doc));
    }

    async findByWorkspaceId(workspaceId: string): Promise<WorkspaceMember[]> {
        const docs = await WorkspaceMemberModel.find({ workspaceId });
        return docs.map(doc => this.toDomain(doc));
    }

    async update(id: string, data: Partial<WorkspaceMember>): Promise<WorkspaceMember> {
        const doc = await WorkspaceMemberModel.findByIdAndUpdate(
            id,
            { $set: { role: data.role } },
            { new: true }
        );
        if (!doc) throw new Error('Workspace member not found');
        return this.toDomain(doc);
    }

    async delete(id: string): Promise<void> {
        await WorkspaceMemberModel.findByIdAndDelete(id);
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
