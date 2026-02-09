"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Workspace = void 0;
const AppError_1 = require("../../../../shared/domain/errors/AppError");
class Workspace {
    constructor(id, tenantId, name, createdAt) {
        this.id = id;
        this.tenantId = tenantId;
        this.name = name;
        this.createdAt = createdAt;
        this.validate();
    }
    validate() {
        if (!this.tenantId || !this.tenantId.trim()) {
            throw new AppError_1.ValidationError('Tenant ID is required');
        }
        if (!this.name || !this.name.trim()) {
            throw new AppError_1.ValidationError('Workspace name is required');
        }
    }
    static create(tenantId, name) {
        const tempWorkspace = new Workspace('temp', tenantId, name);
        return {
            tenantId: tempWorkspace.tenantId,
            name: tempWorkspace.name,
            validate: tempWorkspace.validate.bind(tempWorkspace)
        };
    }
}
exports.Workspace = Workspace;
