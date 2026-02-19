/**
 * WorkItemPriority Enum
 * 
 * Optional priority level for work items.
 * Maps to SQL: priority VARCHAR(20) CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH'))
 */
export enum WorkItemPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH'
}
