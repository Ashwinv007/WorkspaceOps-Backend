"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityController = void 0;
const Entity_1 = require("../../domain/entities/Entity");
/**
 * Entity Controller (Interfaces Layer)
 *
 * Handles HTTP requests for entity operations.
 * Delegates business logic to use cases and formats responses via presenter.
 */
class EntityController {
    constructor(createEntityUseCase, getEntitiesUseCase, updateEntityUseCase, deleteEntityUseCase, presenter) {
        this.createEntityUseCase = createEntityUseCase;
        this.getEntitiesUseCase = getEntitiesUseCase;
        this.updateEntityUseCase = updateEntityUseCase;
        this.deleteEntityUseCase = deleteEntityUseCase;
        this.presenter = presenter;
        // Bind methods to preserve 'this' context
        this.createEntity = this.createEntity.bind(this);
        this.getEntities = this.getEntities.bind(this);
        this.updateEntity = this.updateEntity.bind(this);
        this.deleteEntity = this.deleteEntity.bind(this);
    }
    /**
     * POST /workspaces/:workspaceId/entities
     * Create a new entity
     */
    async createEntity(req, res, next) {
        try {
            const workspaceId = req.params.workspaceId;
            const { name, role } = req.body;
            // Validate role is a valid EntityRole
            if (!Object.values(Entity_1.EntityRole).includes(role)) {
                res.status(400).json({
                    error: `Invalid role. Must be one of: ${Object.values(Entity_1.EntityRole).join(', ')}`
                });
                return;
            }
            const entity = await this.createEntityUseCase.execute({
                workspaceId,
                name,
                role: role
            });
            res.status(201).json(this.presenter.presentEntity(entity));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /workspaces/:workspaceId/entities
     * Get all entities in a workspace
     */
    async getEntities(req, res, next) {
        try {
            const workspaceId = req.params.workspaceId;
            const entities = await this.getEntitiesUseCase.execute({
                workspaceId
            });
            res.status(200).json(this.presenter.presentEntities(entities));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * PUT /workspaces/:workspaceId/entities/:id
     * Update an entity
     */
    async updateEntity(req, res, next) {
        try {
            const workspaceId = req.params.workspaceId;
            const id = req.params.id;
            const { name, role } = req.body;
            // Validate role if provided
            if (role !== undefined && !Object.values(Entity_1.EntityRole).includes(role)) {
                res.status(400).json({
                    error: `Invalid role. Must be one of: ${Object.values(Entity_1.EntityRole).join(', ')}`
                });
                return;
            }
            const entity = await this.updateEntityUseCase.execute({
                id,
                workspaceId,
                name,
                role: role
            });
            res.status(200).json(this.presenter.presentEntity(entity));
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * DELETE /workspaces/:workspaceId/entities/:id
     * Delete an entity
     */
    async deleteEntity(req, res, next) {
        try {
            const workspaceId = req.params.workspaceId;
            const id = req.params.id;
            await this.deleteEntityUseCase.execute({
                id,
                workspaceId
            });
            res.status(204).send();
        }
        catch (error) {
            next(error);
        }
    }
}
exports.EntityController = EntityController;
