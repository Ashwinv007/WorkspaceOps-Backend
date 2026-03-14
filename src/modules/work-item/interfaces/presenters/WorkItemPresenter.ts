import { WorkItemType } from '../../domain/entities/WorkItemType';
import { WorkItem } from '../../domain/entities/WorkItem';
import { WorkItemDocument } from '../../domain/entities/WorkItemDocument';
import { LinkedDocument } from '../../application/use-cases/GetLinkedDocuments';
import { User } from '../../../auth/domain/entities/User';

/**
 * WorkItemPresenter
 *
 * Formats domain entities into API response objects.
 */
export class WorkItemPresenter {

    // --- Work Item Type ---

    presentWorkItemType(type: WorkItemType) {
        return {
            id: type.id,
            workspaceId: type.workspaceId,
            name: type.name,
            description: type.description || null,
            entityType: type.entityType || null,
            createdAt: type.createdAt
        };
    }

    presentWorkItemTypes(types: WorkItemType[]) {
        return {
            workItemTypes: types.map(t => this.presentWorkItemType(t)),
            count: types.length
        };
    }

    // --- Work Item ---

    presentWorkItem(item: WorkItem, linkedDocumentIds?: string[], userMap?: Map<string, User>) {
        const user = item.assignedToUserId ? userMap?.get(item.assignedToUserId) : undefined;
        return {
            id: item.id,
            workspaceId: item.workspaceId,
            workItemTypeId: item.workItemTypeId,
            entityId: item.entityId,
            assignedToUserId: item.assignedToUserId,
            assignedToUserEmail: user?.email ?? null,
            assignedToUserName: user?.name ?? null,
            title: item.title,
            description: item.description || null,
            status: item.status,
            priority: item.priority || null,
            dueDate: item.dueDate || null,
            linkedDocumentIds: linkedDocumentIds || [],
            linkedDocumentCount: linkedDocumentIds ? linkedDocumentIds.length : 0,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
        };
    }

    presentWorkItems(items: WorkItem[], userMap?: Map<string, User>) {
        return {
            workItems: items.map(i => this.presentWorkItem(i, undefined, userMap)),
            count: items.length
        };
    }

    // --- Work Item Document Link ---

    presentWorkItemDocument(link: WorkItemDocument) {
        return {
            id: link.id,
            workItemId: link.workItemId,
            documentId: link.documentId,
            linkedAt: link.linkedAt
        };
    }

    presentWorkItemDocuments(links: WorkItemDocument[]) {
        return {
            linkedDocuments: links.map(l => this.presentWorkItemDocument(l)),
            count: links.length
        };
    }

    // --- Linked Documents (full document objects) ---

    presentLinkedDocument(doc: LinkedDocument, baseUrl: string) {
        return {
            id: doc.id,
            workspaceId: doc.workspaceId,
            documentTypeId: doc.documentTypeId,
            entityId: doc.entityId ?? null,
            fileName: doc.fileName,
            fileSize: doc.fileSize,
            mimeType: doc.mimeType ?? null,
            expiryDate: doc.expiryDate ?? null,
            expiryStatus: doc.calculateExpiryStatus(),
            metadata: doc.metadata ?? null,
            uploadedBy: doc.uploadedBy,
            createdAt: doc.createdAt,
            linkedAt: doc.linkedAt,
            downloadUrl: `${baseUrl}/workspaces/${doc.workspaceId}/documents/${doc.id}/download`
        };
    }

    presentLinkedDocuments(docs: LinkedDocument[], baseUrl: string) {
        return {
            linkedDocuments: docs.map(d => this.presentLinkedDocument(d, baseUrl)),
            count: docs.length
        };
    }
}
