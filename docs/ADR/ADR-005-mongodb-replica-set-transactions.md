# ADR-005: MongoDB Replica Set for ACID Transactions

## Status
Accepted

## Date
2026-03-23

## Context

Several operations in WorkspaceOps write to multiple MongoDB collections atomically:

- **Create workspace** → writes to `workspaces` collection + `workspace_members` collection (owner record)
- **Delete workspace** → deletes workspace + all members, entities, documents, work items

If the first write succeeds but the second fails (network blip, constraint violation, out-of-memory), the database is left in an inconsistent state — e.g. a workspace exists with no owner, or a deleted workspace's entities are still in the database.

MongoDB supports multi-document ACID transactions only on **replica sets** — not on standalone instances. A standalone MongoDB instance only guarantees atomicity at the single-document level.

The alternative to transactions was application-level compensation logic ("if the second write fails, undo the first"). This is complex, error-prone, and hard to test exhaustively.

## Decision

Use **MongoDB Atlas** with a **3-node replica set** as the production and development database.

- Development: Connect to Atlas free tier (M0 — 3-node replica set included)
- Production: Atlas M10+ (dedicated 3-node replica set)
- Transactions wrapped with `session.withTransaction()` for multi-collection writes

This decision also provides:
- **Automatic failover:** If the primary node fails, Atlas promotes a secondary within seconds
- **Oplog-based replication:** Secondaries stay in sync with the primary's operation log
- **Read scaling (future):** Read from secondaries for high-read-volume endpoints

## Consequences

### Positive
- Multi-collection writes are atomic — no partial state possible
- Atlas manages the replica set — no manual MongoDB cluster administration
- Automatic failover gives high availability (Atlas SLA: 99.95%)
- Enables future read-scaling via secondary reads

### Negative / Trade-offs
- Higher cost than a standalone MongoDB instance (Atlas M0 is free, M10 is ~$57/month)
- Slightly higher write latency — writes must be acknowledged by the majority of nodes (write concern: majority) before returning
- Connection string is more complex: `mongodb+srv://` cluster URL vs single host

### Neutral
- `mongodb-memory-server` used in tests also starts a replica set internally — transactions work in the test environment without any Atlas connection
