import { IDocumentRepository } from '../../domain/repositories/IDocumentRepository';
import { Document } from '../../domain/entities/Document';
import { DocumentModel } from './DocumentModel';

/**
 * Document Repository Implementation using Mongoose
 */
export class DocumentRepositoryImpl implements IDocumentRepository {
    async create(document: Omit<Document, 'id' | 'createdAt'>): Promise<Document> {
        const mongoDoc = await DocumentModel.create({
            workspaceId: document.workspaceId,
            documentTypeId: document.documentTypeId,
            entityId: document.entityId,
            fileName: document.fileName,
            fileUrl: document.fileUrl,
            fileSize: document.fileSize,
            mimeType: document.mimeType,
            metadata: document.metadata,
            expiryDate: document.expiryDate,
            uploadedBy: document.uploadedBy
        });

        return this.toDomain(mongoDoc);
    }

    async findById(id: string, workspaceId: string): Promise<Document | null> {
        const mongoDoc = await DocumentModel.findOne({
            _id: id,
            workspaceId
        });

        return mongoDoc ? this.toDomain(mongoDoc) : null;
    }

    async findByWorkspace(
        workspaceId: string,
        filters?: { documentTypeId?: string; entityId?: string }
    ): Promise<Document[]> {
        const query: any = { workspaceId };

        if (filters?.documentTypeId) {
            query.documentTypeId = filters.documentTypeId;
        }

        if (filters?.entityId) {
            query.entityId = filters.entityId;
        }

        const mongoDocs = await DocumentModel.find(query).sort({ createdAt: -1 });

        return mongoDocs.map(doc => this.toDomain(doc));
    }

    async findByEntity(entityId: string, workspaceId: string): Promise<Document[]> {
        const mongoDocs = await DocumentModel.find({
            entityId,
            workspaceId
        }).sort({ createdAt: -1 });

        return mongoDocs.map(doc => this.toDomain(doc));
    }

    async findExpiringDocuments(workspaceId: string, daysThreshold: number): Promise<Document[]> {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysThreshold);

        const mongoDocs = await DocumentModel.find({
            workspaceId,
            expiryDate: {
                $gte: now,
                $lte: futureDate
            }
        }).sort({ expiryDate: 1 });

        return mongoDocs.map(doc => this.toDomain(doc));
    }

    async update(
        id: string,
        workspaceId: string,
        updates: {
            entityId?: string;
            metadata?: Record<string, any>;
            expiryDate?: Date;
        }
    ): Promise<Document | null> {
        const mongoDoc = await DocumentModel.findOneAndUpdate(
            { _id: id, workspaceId },
            { $set: updates },
            { new: true }
        );

        return mongoDoc ? this.toDomain(mongoDoc) : null;
    }

    async delete(id: string, workspaceId: string): Promise<boolean> {
        const result = await DocumentModel.deleteOne({ _id: id, workspaceId });
        return result.deletedCount === 1;
    }

    async countByWorkspace(workspaceId: string): Promise<number> {
        return await DocumentModel.countDocuments({ workspaceId });
    }

    async countExpiringDocuments(workspaceId: string, daysThreshold: number): Promise<number> {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysThreshold);

        return await DocumentModel.countDocuments({
            workspaceId,
            expiryDate: {
                $gte: now,
                $lte: futureDate
            }
        });
    }

    /**
     * Convert Mongoose document to Domain entity
     */
    private toDomain(mongoDoc: any): Document {
        return new Document(
            mongoDoc._id.toString(),
            mongoDoc.workspaceId.toString(),
            mongoDoc.documentTypeId.toString(),
            mongoDoc.fileName,
            mongoDoc.fileUrl,
            mongoDoc.fileSize,
            mongoDoc.uploadedBy.toString(),
            mongoDoc.createdAt,
            mongoDoc.entityId?.toString(),
            mongoDoc.mimeType,
            mongoDoc.metadata,
            mongoDoc.expiryDate
        );
    }
}
