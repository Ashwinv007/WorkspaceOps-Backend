import { IEntityRepository } from '../../../entity/domain/repositories/IEntityRepository';
import { IDocumentRepository } from '../../../document/domain/repositories/IDocumentRepository';
import { IDocumentTypeRepository } from '../../../document-type/domain/repositories/IDocumentTypeRepository';
import { IWorkItemRepository } from '../../../work-item/domain/repositories/IWorkItemRepository';
import { IWorkItemTypeRepository } from '../../../work-item/domain/repositories/IWorkItemTypeRepository';
import { GetOverviewDTO, WorkspaceOverviewResult } from '../dto/OverviewDTO';

const EXPIRY_THRESHOLD_DAYS = 30;

/**
 * GetWorkspaceOverview Use Case
 *
 * Returns aggregated counts for all resources in a workspace.
 * All queries run in parallel for performance.
 */
export class GetWorkspaceOverview {
    constructor(
        private readonly entityRepo: IEntityRepository,
        private readonly documentRepo: IDocumentRepository,
        private readonly documentTypeRepo: IDocumentTypeRepository,
        private readonly workItemRepo: IWorkItemRepository,
        private readonly workItemTypeRepo: IWorkItemTypeRepository
    ) {}

    async execute(dto: GetOverviewDTO): Promise<WorkspaceOverviewResult> {
        const { workspaceId } = dto;

        const [
            entityTotal,
            documentTotal,
            documentExpiring,
            documentExpired,
            workItemStatusCounts,
            documentTypeTotal,
            workItemTypeTotal
        ] = await Promise.all([
            this.entityRepo.countByWorkspace(workspaceId),
            this.documentRepo.countByWorkspace(workspaceId),
            this.documentRepo.countExpiringDocuments(workspaceId, EXPIRY_THRESHOLD_DAYS),
            this.documentRepo.countExpiredDocuments(workspaceId),
            this.workItemRepo.countByStatusGrouped(workspaceId),
            this.documentTypeRepo.countByWorkspace(workspaceId),
            this.workItemTypeRepo.countByWorkspace(workspaceId)
        ]);

        const documentValid = documentTotal - documentExpiring - documentExpired;

        return {
            workspaceId,
            entities: { total: entityTotal },
            documents: {
                total: documentTotal,
                VALID: documentValid,
                EXPIRING: documentExpiring,
                EXPIRED: documentExpired
            },
            workItems: {
                total: workItemStatusCounts.DRAFT + workItemStatusCounts.ACTIVE + workItemStatusCounts.COMPLETED,
                DRAFT: workItemStatusCounts.DRAFT,
                ACTIVE: workItemStatusCounts.ACTIVE,
                COMPLETED: workItemStatusCounts.COMPLETED
            },
            documentTypes: { total: documentTypeTotal },
            workItemTypes: { total: workItemTypeTotal }
        };
    }
}
