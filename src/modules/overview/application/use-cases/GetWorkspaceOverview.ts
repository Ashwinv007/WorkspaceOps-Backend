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
 * Returns aggregated counts and summary data for all resources in a workspace.
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
            entityByRole,
            documentTotal,
            documentExpiring,
            documentExpired,
            workItemStatusCounts,
            documentTypes,
            workItemTypes
        ] = await Promise.all([
            this.entityRepo.countByWorkspace(workspaceId),
            this.entityRepo.countByRoleGrouped(workspaceId),
            this.documentRepo.countByWorkspace(workspaceId),
            this.documentRepo.countExpiringDocuments(workspaceId, EXPIRY_THRESHOLD_DAYS),
            this.documentRepo.countExpiredDocuments(workspaceId),
            this.workItemRepo.countByStatusGrouped(workspaceId),
            this.documentTypeRepo.findByWorkspaceId(workspaceId),
            this.workItemTypeRepo.findByWorkspace(workspaceId)
        ]);

        const documentValid = documentTotal - documentExpiring - documentExpired;

        // Fetch field counts for each document type in parallel
        const docTypesWithFields = await Promise.all(
            documentTypes.map(async (dt) => {
                const fields = await this.documentTypeRepo.getFields(dt.id);
                return {
                    id: dt.id,
                    name: dt.name,
                    hasMetadata: dt.hasMetadata,
                    hasExpiry: dt.hasExpiry,
                    fieldCount: fields.length
                };
            })
        );

        return {
            workspaceId,
            entities: {
                total: entityTotal,
                byRole: {
                    CUSTOMER: entityByRole.CUSTOMER ?? 0,
                    EMPLOYEE: entityByRole.EMPLOYEE ?? 0,
                    VENDOR: entityByRole.VENDOR ?? 0,
                    SELF: entityByRole.SELF ?? 0
                }
            },
            documents: {
                total: documentTotal,
                byStatus: {
                    VALID: documentValid,
                    EXPIRING: documentExpiring,
                    EXPIRED: documentExpired
                }
            },
            workItems: {
                total: workItemStatusCounts.DRAFT + workItemStatusCounts.ACTIVE + workItemStatusCounts.COMPLETED,
                byStatus: {
                    DRAFT: workItemStatusCounts.DRAFT,
                    ACTIVE: workItemStatusCounts.ACTIVE,
                    COMPLETED: workItemStatusCounts.COMPLETED
                }
            },
            documentTypes: docTypesWithFields,
            workItemTypes: workItemTypes.map(wit => ({
                id: wit.id,
                name: wit.name,
                ...(wit.entityType && { entityType: wit.entityType })
            }))
        };
    }
}
