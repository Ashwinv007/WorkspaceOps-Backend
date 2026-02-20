/**
 * OverviewDTO
 *
 * Input and output types for the workspace overview use case.
 */

export interface GetOverviewDTO {
    workspaceId: string;
    userId: string;
}

export interface OverviewDocumentType {
    id: string;
    name: string;
    hasMetadata: boolean;
    hasExpiry: boolean;
    fieldCount: number;
}

export interface OverviewWorkItemType {
    id: string;
    name: string;
    entityType?: string;
}

export interface WorkspaceOverviewResult {
    workspaceId: string;
    entities: {
        total: number;
        byRole: {
            CUSTOMER: number;
            EMPLOYEE: number;
            VENDOR: number;
            SELF: number;
        };
    };
    documents: {
        total: number;
        byStatus: {
            VALID: number;
            EXPIRING: number;
            EXPIRED: number;
        };
    };
    workItems: {
        total: number;
        byStatus: {
            DRAFT: number;
            ACTIVE: number;
            COMPLETED: number;
        };
    };
    documentTypes: OverviewDocumentType[];
    workItemTypes: OverviewWorkItemType[];
}
