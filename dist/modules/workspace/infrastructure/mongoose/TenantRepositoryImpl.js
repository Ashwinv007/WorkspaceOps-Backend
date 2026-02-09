"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantRepositoryImpl = void 0;
const Tenant_1 = require("../../domain/entities/Tenant");
const TenantModel_1 = require("./TenantModel");
class TenantRepositoryImpl {
    async create(tenant) {
        const doc = await TenantModel_1.TenantModel.create({
            name: tenant.name
        });
        return this.toDomain(doc);
    }
    async findById(id) {
        const doc = await TenantModel_1.TenantModel.findById(id);
        if (!doc)
            return null;
        return this.toDomain(doc);
    }
    toDomain(doc) {
        return new Tenant_1.Tenant(doc._id.toString(), doc.name, doc.createdAt);
    }
}
exports.TenantRepositoryImpl = TenantRepositoryImpl;
