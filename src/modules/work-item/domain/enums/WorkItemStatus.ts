/**
 * WorkItemStatus Enum
 * 
 * Represents the lifecycle state of a work item.
 * Bidirectional transitions: DRAFT ↔ ACTIVE ↔ COMPLETED
 * Direct DRAFT ↔ COMPLETED transition is blocked.
 */
export enum WorkItemStatus {
    DRAFT = 'DRAFT',
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED'
}
