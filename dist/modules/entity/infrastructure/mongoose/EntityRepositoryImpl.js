"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityRepositoryImpl = void 0;
const Entity_1 = require("../../domain/entities/Entity");
const EntityModel_1 = require("./EntityModel");
const AppError_1 = require("../../../../shared/domain/errors/AppError");
/**
 * Entity Repository Implementation (Infrastructure Layer)
 *
 * Implements IEntityRepository using Mongoose.
 */
class EntityRepositoryImpl {
    /**
     * Create a new entity
     */
    async create(entity) {
        const doc = await EntityModel_1.EntityModel.create({
            workspaceId: entity.workspaceId,
            name: entity.name,
            role: entity.role
        });
        return new Entity_1.Entity(doc._id.toString(), doc.workspaceId.toString(), doc.name, doc.role, doc.createdAt);
    }
    /**
     * Find entity by ID
     */
    async findById(id) {
        const doc = await EntityModel_1.EntityModel.findById(id);
        if (!doc) {
            return null;
        }
        return new Entity_1.Entity(doc._id.toString(), doc.workspaceId.toString(), doc.name, doc.role, doc.createdAt);
    }
    /**
     * Find all entities in a workspace
     */
    async findByWorkspaceId(workspaceId) {
        const docs = await EntityModel_1.EntityModel.find({ workspaceId })
            .sort({ createdAt: -1 }); // Most recent first
        return docs.map(doc => new Entity_1.Entity(doc._id.toString(), doc.workspaceId.toString(), doc.name, doc.role, doc.createdAt));
    }
    /**
     * Update entity
     */
    async update(id, updates) {
        const doc = await EntityModel_1.EntityModel.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
        if (!doc) {
            throw new AppError_1.NotFoundError('Entity not found');
        }
        return new Entity_1.Entity(doc._id.toString(), doc.workspaceId.toString(), doc.name, doc.role, doc.createdAt);
    }
    /**
     * Delete entity
     */
    async delete(id) {
        const result = await EntityModel_1.EntityModel.findByIdAndDelete(id);
        if (!result) {
            throw new AppError_1.NotFoundError('Entity not found');
        }
    }
}
exports.EntityRepositoryImpl = EntityRepositoryImpl;
