import mongoose from 'mongoose';
import { IEntityRepository } from '../../domain/repositories/IEntityRepository';
import { Entity, EntityRole } from '../../domain/entities/Entity';
import { EntityModel } from './EntityModel';
import { NotFoundError } from '../../../../shared/domain/errors/AppError';

/**
 * Entity Repository Implementation (Infrastructure Layer)
 * 
 * Implements IEntityRepository using Mongoose.
 */
export class EntityRepositoryImpl implements IEntityRepository {
    /**
     * Create a new entity
     */
    async create(entity: Omit<Entity, 'id' | 'createdAt'>): Promise<Entity> {
        const doc = await EntityModel.create({
            workspaceId: entity.workspaceId,
            name: entity.name,
            role: entity.role
        });

        return new Entity(
            doc._id.toString(),
            doc.workspaceId.toString(),
            doc.name,
            doc.role as EntityRole,
            doc.createdAt
        );
    }

    /**
     * Find entity by ID
     */
    async findById(id: string): Promise<Entity | null> {
        const doc = await EntityModel.findById(id);

        if (!doc) {
            return null;
        }

        return new Entity(
            doc._id.toString(),
            doc.workspaceId.toString(),
            doc.name,
            doc.role as EntityRole,
            doc.createdAt
        );
    }

    /**
     * Find all entities in a workspace
     */
    async findByWorkspaceId(workspaceId: string): Promise<Entity[]> {
        const docs = await EntityModel.find({ workspaceId })
            .sort({ createdAt: -1 }); // Most recent first

        return docs.map(doc => new Entity(
            doc._id.toString(),
            doc.workspaceId.toString(),
            doc.name,
            doc.role as EntityRole,
            doc.createdAt
        ));
    }

    /**
     * Update entity
     */
    async update(id: string, updates: Partial<Pick<Entity, 'name' | 'role'>>): Promise<Entity> {
        const doc = await EntityModel.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!doc) {
            throw new NotFoundError('Entity not found');
        }

        return new Entity(
            doc._id.toString(),
            doc.workspaceId.toString(),
            doc.name,
            doc.role as EntityRole,
            doc.createdAt
        );
    }

    /**
     * Delete entity
     */
    async delete(id: string): Promise<void> {
        const result = await EntityModel.findByIdAndDelete(id);

        if (!result) {
            throw new NotFoundError('Entity not found');
        }
    }

    /**
     * Count total entities in a workspace (for overview)
     */
    async countByWorkspace(workspaceId: string): Promise<number> {
        return EntityModel.countDocuments({ workspaceId });
    }

    /**
     * Count entities grouped by role (for overview byRole breakdown)
     */
    async countByRoleGrouped(workspaceId: string): Promise<Record<string, number>> {
        const results = await EntityModel.aggregate([
            { $match: { workspaceId: new mongoose.Types.ObjectId(workspaceId) } },
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);

        const counts: Record<string, number> = { CUSTOMER: 0, EMPLOYEE: 0, VENDOR: 0, SELF: 0 };
        results.forEach((item: { _id: string; count: number }) => {
            counts[item._id] = item.count;
        });
        return counts;
    }

    /**
     * Find entities in a workspace with optional role filter
     */
    async findByWorkspaceIdFiltered(workspaceId: string, role?: string): Promise<Entity[]> {
        const query: Record<string, string> = { workspaceId };
        if (role) query.role = role;

        const docs = await EntityModel.find(query).sort({ createdAt: -1 });

        return docs.map(doc => new Entity(
            doc._id.toString(),
            doc.workspaceId.toString(),
            doc.name,
            doc.role as EntityRole,
            doc.createdAt
        ));
    }
}
