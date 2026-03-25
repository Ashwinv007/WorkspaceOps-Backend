# ADR-006: Fire-and-Forget Audit Logging

## Status
Accepted

## Date
2026-03-23

## Context

WorkspaceOps requires an audit trail — every write operation (create, update, delete, status change) must be recorded with who did it, when, and what changed. This is a cross-cutting concern that affects all 8 modules.

Three implementation approaches were evaluated:

1. **Synchronous (awaited):** The use case `await`s the audit log write before returning. If the audit write is slow or fails, the main operation fails too.

2. **Fire-and-forget:** The use case calls `auditLogService?.log(...)` without `await`. The main operation returns immediately. The audit write happens asynchronously.

3. **Message queue:** The use case publishes an event to a queue (Redis Bull / AWS SQS). A separate worker consumes it and writes the log with retry logic.

The audit log is **observational** — it records what happened. It should never be the reason a user's legitimate operation fails.

## Decision

Use **fire-and-forget** for MVP: `await this.auditLogService?.log({...})` with `void` semantics — the `await` only prevents the `?.log()` call from being unhandled, but failures are swallowed.

The `auditLogService` is injected as an **optional dependency** (`auditLogService?`). If not provided (e.g. in unit tests), the audit log call is silently skipped — no test changes needed.

The service is a singleton exported from `auditLog.routes.ts` and injected into all other modules' route files at startup.

## Consequences

### Positive
- Main operation latency is unaffected by audit log write speed
- A failing audit log write never causes a user-facing error
- Zero boilerplate to add audit logging to a new use case — one `?.log()` call
- Unit tests don't need to mock the audit log service — it's optional

### Negative / Trade-offs
- **Silent data loss:** If the audit log write fails (DB unavailable, schema error), the log entry is permanently lost — no retry, no recovery
- **No delivery guarantee:** Fire-and-forget is at-most-once delivery — the audit event may not be written even though the main operation succeeded
- Async errors from the log write are swallowed — failure is invisible unless server logs are monitored

### Neutral
- **Upgrade path:** Replace with a message queue (Redis Bull or AWS SQS) for guaranteed delivery with retries. The `IAuditLogService` interface means the Use Cases don't change — only the implementation is swapped in the Infrastructure layer (consistent with ADR-001)
- Acceptable for MVP: audit log loss rate is very low in practice (MongoDB Atlas is highly available), and the main value of audit logs is historical review, not real-time guarantees
