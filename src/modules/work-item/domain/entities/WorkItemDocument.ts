/**
 * WorkItemDocument Domain Entity
 * 
 * Junction entity representing a link between a work item and a document.
 * Stored in a separate collection (per MongoDB schema).
 * 
 * ER Diagram mapping:
 * {
 *   id: UUID PK,
 *   work_item_id: UUID FK → work_items,
 *   document_id: UUID FK → documents,
 *   linked_at: TIMESTAMP
 * }
 */
export class WorkItemDocument {
    constructor(
        public readonly id: string,
        public readonly workItemId: string,
        public readonly documentId: string,
        public readonly linkedAt: Date
    ) { }
}
