import { IWorkItemDocumentRepository } from '../../domain/repositories/IWorkItemDocumentRepository';
import { WorkItemDocument } from '../../domain/entities/WorkItemDocument';
import { WorkItemDocumentModel } from './WorkItemDocumentModel';

/**
 * WorkItemDocument Repository Implementation (Mongoose)
 * 
 * Manages the separate workItemDocuments collection for work item ↔ document linking.
 */
export class WorkItemDocumentRepositoryImpl implements IWorkItemDocumentRepository {

    private toDomain(mongoDoc: any): WorkItemDocument {
        return new WorkItemDocument(
            mongoDoc._id.toString(),
            mongoDoc.workItemId.toString(),
            mongoDoc.documentId.toString(),
            mongoDoc.linkedAt
        );
    }

    async link(workItemId: string, documentId: string): Promise<WorkItemDocument> {
        const mongoDoc = await WorkItemDocumentModel.create({
            workItemId,
            documentId
        });
        return this.toDomain(mongoDoc);
    }

    async unlink(workItemId: string, documentId: string): Promise<boolean> {
        const result = await WorkItemDocumentModel.deleteOne({ workItemId, documentId });
        return result.deletedCount > 0;
    }

    async findByWorkItem(workItemId: string): Promise<WorkItemDocument[]> {
        const mongoDocs = await WorkItemDocumentModel.find({ workItemId }).sort({ linkedAt: -1 });
        return mongoDocs.map(doc => this.toDomain(doc));
    }

    async exists(workItemId: string, documentId: string): Promise<boolean> {
        const count = await WorkItemDocumentModel.countDocuments({ workItemId, documentId });
        return count > 0;
    }

    async deleteByWorkItem(workItemId: string): Promise<number> {
        const result = await WorkItemDocumentModel.deleteMany({ workItemId });
        return result.deletedCount;
    }
}
