"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Entity = exports.EntityRole = void 0;
const AppError_1 = require("../../../../shared/domain/errors/AppError");
/**
 * Entity Role Enum
 * Maps to SQL: role VARCHAR(20) CHECK (role IN ('SELF', 'CUSTOMER', 'EMPLOYEE', 'VENDOR'))
 */
var EntityRole;
(function (EntityRole) {
    EntityRole["SELF"] = "SELF";
    EntityRole["CUSTOMER"] = "CUSTOMER";
    EntityRole["EMPLOYEE"] = "EMPLOYEE";
    EntityRole["VENDOR"] = "VENDOR";
})(EntityRole || (exports.EntityRole = EntityRole = {}));
/**
 * Entity Domain Entity
 *
 * Maps to SQL table:
 * CREATE TABLE entities (
 *   id UUID PRIMARY KEY,
 *   workspace_id UUID NOT NULL REFERENCES workspaces(id),
 *   name VARCHAR(255) NOT NULL,
 *   role VARCHAR(20) NOT NULL CHECK (role IN ('SELF', 'CUSTOMER', 'EMPLOYEE', 'VENDOR')),
 *   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 * );
 */
class Entity {
    constructor(id, workspaceId, name, role, createdAt) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.name = name;
        this.role = role;
        this.createdAt = createdAt;
        this.validate();
    }
    validate() {
        if (!this.workspaceId || !this.workspaceId.trim()) {
            throw new AppError_1.ValidationError('Workspace ID is required');
        }
        if (!this.name || !this.name.trim()) {
            throw new AppError_1.ValidationError('Entity name is required');
        }
        if (this.name.trim().length > 255) {
            throw new AppError_1.ValidationError('Entity name must not exceed 255 characters');
        }
        if (!Object.values(EntityRole).includes(this.role)) {
            throw new AppError_1.ValidationError(`Invalid entity role. Must be one of: ${Object.values(EntityRole).join(', ')}`);
        }
    }
    /**
     * Factory method for creating new entities
     */
    static create(workspaceId, name, role) {
        const tempEntity = new Entity('temp', workspaceId, name.trim(), role);
        return {
            workspaceId: tempEntity.workspaceId,
            name: tempEntity.name,
            role: tempEntity.role,
            validate: tempEntity.validate.bind(tempEntity)
        };
    }
}
exports.Entity = Entity;
