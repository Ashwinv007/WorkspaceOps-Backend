"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityPresenter = void 0;
/**
 * Entity Presenter (Interfaces Layer)
 *
 * Formats entity data for HTTP responses.
 */
class EntityPresenter {
    /**
     * Present a single entity
     */
    presentEntity(entity) {
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
    presentEntities(entities) {
        return {
            entities: entities.map(entity => this.presentEntity(entity)),
            count: entities.length
        };
    }
}
exports.EntityPresenter = EntityPresenter;
