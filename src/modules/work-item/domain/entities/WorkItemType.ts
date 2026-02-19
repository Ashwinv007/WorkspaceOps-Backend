import { ValidationError } from '../../../../shared/domain/errors/AppError';

/**
 * WorkItemType Domain Entity
 * 
 * Defines a category/template for work items within a workspace.
 * Optionally restricts which entity roles can use this type.
 * 
 * ER Diagram mapping:
 * {
 *   id: UUID PK,
 *   workspace_id: UUID FK → workspaces,
 *   name: VARCHAR(255),
 *   description: TEXT,
 *   entity_type: VARCHAR(20) CHECK (IN ('SELF','CUSTOMER','EMPLOYEE','VENDOR')),
 *   created_at: TIMESTAMP
 * }
 */
export class WorkItemType {
    constructor(
        public readonly id: string,
        public readonly workspaceId: string,
        public readonly name: string,
        public readonly createdAt: Date,
        public readonly description?: string,
        public readonly entityType?: string
    ) {
        this.validate();
    }

    private validate(): void {
        if (!this.workspaceId || !this.workspaceId.trim()) {
            throw new ValidationError('Workspace ID is required');
        }

        if (!this.name || !this.name.trim()) {
            throw new ValidationError('Work item type name is required');
        }

        if (this.name.trim().length > 255) {
            throw new ValidationError('Work item type name must not exceed 255 characters');
        }

        if (this.description && this.description.length > 1000) {
            throw new ValidationError('Description must not exceed 1000 characters');
        }

        const validEntityTypes = ['SELF', 'CUSTOMER', 'EMPLOYEE', 'VENDOR'];
        if (this.entityType && !validEntityTypes.includes(this.entityType)) {
            throw new ValidationError(
                `Invalid entity type. Must be one of: ${validEntityTypes.join(', ')}`
            );
        }
    }

    /**
     * Factory method for creating new work item types (without id and createdAt)
     */
    static create(
        workspaceId: string,
        name: string,
        description?: string,
        entityType?: string
    ): Omit<WorkItemType, 'id' | 'createdAt'> {
        const temp = new WorkItemType('temp', workspaceId, name.trim(), new Date(), description?.trim(), entityType);
        return {
            workspaceId: temp.workspaceId,
            name: temp.name,
            description: temp.description,
            entityType: temp.entityType,
            validate: temp.validate.bind(temp)
        } as any;
    }
}
