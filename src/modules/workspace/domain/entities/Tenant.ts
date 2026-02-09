import { ValidationError } from '../../../../shared/domain/errors/AppError';

export class Tenant {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly createdAt?: Date
    ) {
        this.validate();
    }

    private validate(): void {
        if (!this.name || !this.name.trim()) {
            throw new ValidationError('Tenant name is required');
        }
    }

    static create(name: string): Omit<Tenant, 'id' | 'createdAt'> {
        const tempTenant = new Tenant('temp', name);
        return {
            name: tempTenant.name,
            validate: tempTenant.validate.bind(tempTenant)
        } as any;
    }
}
