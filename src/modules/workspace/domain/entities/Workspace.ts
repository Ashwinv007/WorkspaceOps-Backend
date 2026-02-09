import { ValidationError } from '../../../../shared/domain/errors/AppError';

export class Workspace {
    constructor(
        public readonly id: string,
        public readonly tenantId: string,
        public readonly name: string,
        public readonly createdAt?: Date
    ) {
        this.validate();
    }

    private validate(): void {
        if (!this.tenantId || !this.tenantId.trim()) {
            throw new ValidationError('Tenant ID is required');
        }
        if (!this.name || !this.name.trim()) {
            throw new ValidationError('Workspace name is required');
        }
    }

    static create(tenantId: string, name: string): Omit<Workspace, 'id' | 'createdAt'> {
        const tempWorkspace = new Workspace('temp', tenantId, name);
        return {
            tenantId: tempWorkspace.tenantId,
            name: tempWorkspace.name,
            validate: tempWorkspace.validate.bind(tempWorkspace)
        } as any;
    }
}
