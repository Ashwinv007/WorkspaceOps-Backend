# ADR-002: MongoDB with Mongoose (over PostgreSQL / TypeORM)

## Status
Accepted

## Date
2026-03-23

## Context

A database technology had to be chosen for WorkspaceOps. The primary candidates were:

1. **PostgreSQL + TypeORM** — relational, strict schema, SQL
2. **MongoDB + Mongoose** — document store, flexible schema, JSON-native

The domain model has two characteristics that drove the decision:

**Dynamic metadata schemas:** Each workspace defines its own Document Types with custom metadata fields (e.g. "passport number", "expiry date", "license plate"). These field definitions are unknown at schema design time and differ per workspace. In a relational model, this requires an EAV (Entity-Attribute-Value) table or JSONB columns — both awkward to query and validate.

**Document-oriented data:** A workspace with its members and roles, a document with its metadata fields, a work item with its linked documents — these are naturally nested documents, not flat rows with foreign keys.

## Decision

Use **MongoDB** hosted on **MongoDB Atlas** (3-node replica set), accessed via **Mongoose** ODM.

Mongoose was chosen over the raw MongoDB Node.js driver because:
- Schema definition at the application level provides validation and structure even though MongoDB is schemaless
- Mature TypeScript support with well-typed models
- Built-in population (join-like behaviour for references)
- Industry standard — most Node.js + MongoDB projects use Mongoose

## Consequences

### Positive
- Dynamic metadata fields map naturally to embedded document arrays — no EAV tables
- Workspace-scoped data (entities, documents, work items) are natural document collections
- Flexible schema means adding new fields to documents doesn't require migrations
- MongoDB Atlas provides managed backups, monitoring, and automatic failover
- Atlas 3-node replica set enables ACID transactions (see ADR-005)

### Negative / Trade-offs
- No foreign key constraints — referential integrity enforced at the application layer (use cases validate existence before writes)
- No native JOIN — cross-collection queries require multiple round-trips or `$lookup` aggregation
- Schema flexibility is a double-edged sword — inconsistent data can accumulate if application-level validation is incomplete
- Team must be disciplined about workspace-scoping every query (`workspaceId` filter on every collection access)

### Neutral
- TypeORM was not selected because its MongoDB support is historically weaker than its SQL support, and Mongoose is the de facto standard for MongoDB + TypeScript
