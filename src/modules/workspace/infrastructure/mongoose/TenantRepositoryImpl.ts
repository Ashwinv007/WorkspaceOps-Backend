import { ITenantRepository } from '../../domain/repositories/ITenantRepository';
import { Tenant } from '../../domain/entities/Tenant';
import { TenantModel } from './TenantModel';

export class TenantRepositoryImpl implements ITenantRepository {
    async create(tenant: Omit<Tenant, 'id' | 'createdAt'>): Promise<Tenant> {
        const doc = await TenantModel.create({
            name: tenant.name
        });
        return this.toDomain(doc);
    }

    async findById(id: string): Promise<Tenant | null> {
        const doc = await TenantModel.findById(id);
        if (!doc) return null;
        return this.toDomain(doc);
    }

    private toDomain(doc: any): Tenant {
        return new Tenant(
            doc._id.toString(),
            doc.name,
            doc.createdAt
        );
    }
}
