import { Tenant } from '../entities/Tenant';

export interface ITenantRepository {
    create(tenant: Omit<Tenant, 'id' | 'createdAt'>): Promise<Tenant>;
    findById(id: string): Promise<Tenant | null>;
}
