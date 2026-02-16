import { Entity } from '../../domain/entities/Entity';

/**
 * Entity Presenter (Interfaces Layer)
 * 
 * Formats entity data for HTTP responses.
 */
export class EntityPresenter {
    /**
     * Present a single entity
     */
    presentEntity(entity: Entity) {
        return {
            id: entity.id,
            workspaceId: entity.workspaceId,
            name: entity.name,
            role: entity.role,
            createdAt: entity.createdAt
        };
    }

    /**
     * Present multiple entities
     */
    presentEntities(entities: Entity[]) {
        return {
            entities: entities.map(entity => this.presentEntity(entity)),
            count: entities.length
        };
    }
}
