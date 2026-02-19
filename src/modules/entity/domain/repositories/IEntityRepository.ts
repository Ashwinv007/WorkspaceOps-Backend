import { Entity } from '../entities/Entity';

/**
 * Entity Repository Interface (Domain Layer)
 * 
 * Defines the contract for entity persistence operations.
 * Infrastructure layer will implement this interface.
 */
export interface IEntityRepository {
    /**
     * Create a new entity
     */
    create(entity: Omit<Entity, 'id' | 'createdAt'>): Promise<Entity>;

    /**
     * Find entity by ID
     */
    findById(id: string): Promise<Entity | null>;

    /**
     * Find all entities in a workspace
     */
    findByWorkspaceId(workspaceId: string): Promise<Entity[]>;

    /**
     * Update entity
     */
    update(id: string, updates: Partial<Pick<Entity, 'name' | 'role'>>): Promise<Entity>;

    /**
     * Delete entity
     */
    delete(id: string): Promise<void>;

    /**
     * Count total entities in a workspace (for overview)
     */
    countByWorkspace(workspaceId: string): Promise<number>;
}
