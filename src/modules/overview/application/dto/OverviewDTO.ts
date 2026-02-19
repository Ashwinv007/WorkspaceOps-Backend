/**
 * OverviewDTO
 *
 * Input and output types for the workspace overview use case.
 */

export interface GetOverviewDTO {
    workspaceId: string;
    userId: string;
}

export interface WorkspaceOverviewResult {
    workspaceId: string;
    entities: {
        total: number;
    };
    documents: {
        total: number;
        VALID: number;
        EXPIRING: number;
        EXPIRED: number;
    };
    workItems: {
        total: number;
        DRAFT: number;
        ACTIVE: number;
        COMPLETED: number;
    };
    documentTypes: {
        total: number;
    };
    workItemTypes: {
        total: number;
    };
}
