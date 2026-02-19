import { Request, Response, NextFunction } from 'express';
import { CreateEntity } from '../../application/use-cases/CreateEntity';
import { GetEntities } from '../../application/use-cases/GetEntities';
import { UpdateEntity } from '../../application/use-cases/UpdateEntity';
import { DeleteEntity } from '../../application/use-cases/DeleteEntity';
import { EntityPresenter } from '../presenters/EntityPresenter';
import { EntityRole } from '../../domain/entities/Entity';

/**
 * Entity Controller (Interfaces Layer)
 * 
 * Handles HTTP requests for entity operations.
 * Delegates business logic to use cases and formats responses via presenter.
 */
export class EntityController {
    constructor(
        private readonly createEntityUseCase: CreateEntity,
        private readonly getEntitiesUseCase: GetEntities,
        private readonly updateEntityUseCase: UpdateEntity,
        private readonly deleteEntityUseCase: DeleteEntity,
        private readonly presenter: EntityPresenter
    ) {
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
    async createEntity(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaceId = req.params.workspaceId as string;
            const { name, role } = req.body;

            // Validate role is a valid EntityRole
            if (!Object.values(EntityRole).includes(role)) {
                res.status(400).json({
                    error: `Invalid role. Must be one of: ${Object.values(EntityRole).join(', ')}`
                });
                return;
            }

            const entity = await this.createEntityUseCase.execute({
                workspaceId,
                userId: req.user!.userId,
                name,
                role: role as EntityRole
            });

            res.status(201).json(this.presenter.presentEntity(entity));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /workspaces/:workspaceId/entities
     * Get all entities in a workspace
     */
    async getEntities(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaceId = req.params.workspaceId as string;

            const entities = await this.getEntitiesUseCase.execute({
                workspaceId
            });

            res.status(200).json(this.presenter.presentEntities(entities));
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /workspaces/:workspaceId/entities/:id
     * Update an entity
     */
    async updateEntity(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaceId = req.params.workspaceId as string;
            const id = req.params.id as string;
            const { name, role } = req.body;

            // Validate role if provided
            if (role !== undefined && !Object.values(EntityRole).includes(role)) {
                res.status(400).json({
                    error: `Invalid role. Must be one of: ${Object.values(EntityRole).join(', ')}`
                });
                return;
            }

            const entity = await this.updateEntityUseCase.execute({
                id,
                workspaceId,
                userId: req.user!.userId,
                name,
                role: role as EntityRole | undefined
            });

            res.status(200).json(this.presenter.presentEntity(entity));
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /workspaces/:workspaceId/entities/:id
     * Delete an entity
     */
    async deleteEntity(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const workspaceId = req.params.workspaceId as string;
            const id = req.params.id as string;

            await this.deleteEntityUseCase.execute({
                id,
                workspaceId,
                userId: req.user!.userId
            });

            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}
