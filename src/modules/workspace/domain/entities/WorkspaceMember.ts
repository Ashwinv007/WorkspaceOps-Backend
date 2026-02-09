import { ValidationError } from '../../../../shared/domain/errors/AppError';

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export class WorkspaceMember {
    constructor(
        public readonly id: string,
        public readonly workspaceId: string,
        public readonly userId: string,
        public readonly role: WorkspaceRole,
        public readonly createdAt?: Date
    ) {
        this.validate();
    }

    private validate(): void {
        if (!this.workspaceId) throw new ValidationError('Workspace ID is required');
        if (!this.userId) throw new ValidationError('User ID is required');
        if (!this.isValidRole(this.role)) {
            throw new ValidationError('Invalid role');
        }
    }

    private isValidRole(role: string): boolean {
        return ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'].includes(role);
    }

    static create(workspaceId: string, userId: string, role: WorkspaceRole): Omit<WorkspaceMember, 'id' | 'createdAt'> {
        const tempMember = new WorkspaceMember('temp', workspaceId, userId, role);
        return {
            workspaceId: tempMember.workspaceId,
            userId: tempMember.userId,
            role: tempMember.role,
            validate: tempMember.validate.bind(tempMember)
        } as any;
    }
}
