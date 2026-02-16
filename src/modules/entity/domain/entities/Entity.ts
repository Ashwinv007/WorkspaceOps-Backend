import { ValidationError } from '../../../../shared/domain/errors/AppError';

/**
 * Entity Role Enum
 * Maps to SQL: role VARCHAR(20) CHECK (role IN ('SELF', 'CUSTOMER', 'EMPLOYEE', 'VENDOR'))
 */
export enum EntityRole {
    SELF = 'SELF',
    CUSTOMER = 'CUSTOMER',
    EMPLOYEE = 'EMPLOYEE',
    VENDOR = 'VENDOR'
}

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
export class Entity {
    constructor(
        public readonly id: string,
        public readonly workspaceId: string,
        public readonly name: string,
        public readonly role: EntityRole,
        public readonly createdAt?: Date
    ) {
        this.validate();
    }

    private validate(): void {
        if (!this.workspaceId || !this.workspaceId.trim()) {
            throw new ValidationError('Workspace ID is required');
        }

        if (!this.name || !this.name.trim()) {
            throw new ValidationError('Entity name is required');
        }

        if (this.name.trim().length > 255) {
            throw new ValidationError('Entity name must not exceed 255 characters');
        }

        if (!Object.values(EntityRole).includes(this.role)) {
            throw new ValidationError(
                `Invalid entity role. Must be one of: ${Object.values(EntityRole).join(', ')}`
            );
        }
    }

    /**
     * Factory method for creating new entities
     */
    static create(
        workspaceId: string,
        name: string,
        role: EntityRole
    ): Omit<Entity, 'id' | 'createdAt'> {
        const tempEntity = new Entity('temp', workspaceId, name.trim(), role);
        return {
            workspaceId: tempEntity.workspaceId,
            name: tempEntity.name,
            role: tempEntity.role,
            validate: tempEntity.validate.bind(tempEntity)
        } as any;
    }
}
