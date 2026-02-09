"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tenant = void 0;
const AppError_1 = require("../../../../shared/domain/errors/AppError");
class Tenant {
    constructor(id, name, createdAt) {
        this.id = id;
        this.name = name;
        this.createdAt = createdAt;
        this.validate();
    }
    validate() {
        if (!this.name || !this.name.trim()) {
            throw new AppError_1.ValidationError('Tenant name is required');
        }
    }
    static create(name) {
        const tempTenant = new Tenant('temp', name);
        return {
            name: tempTenant.name,
            validate: tempTenant.validate.bind(tempTenant)
        };
    }
}
exports.Tenant = Tenant;
