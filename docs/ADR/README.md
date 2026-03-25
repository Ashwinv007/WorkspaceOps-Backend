# Architecture Decision Records (ADRs)

An ADR is a short document capturing a single architectural decision: the context that prompted it, what was decided, and the trade-offs accepted.

**Format:** Context → Decision → Consequences (positive / negative / neutral)
**Status values:** `Proposed` | `Accepted` | `Deprecated` | `Superseded by ADR-XXX`

---

## Index

| ADR | Title | Status |
|---|---|---|
| [ADR-001](./ADR-001-clean-architecture.md) | Clean Architecture Pattern | Accepted |
| [ADR-002](./ADR-002-mongodb-mongoose.md) | MongoDB with Mongoose (over PostgreSQL / TypeORM) | Accepted |
| [ADR-003](./ADR-003-manual-dependency-injection.md) | Manual Dependency Injection (over DI Container) | Accepted |
| [ADR-004](./ADR-004-jwt-authentication.md) | JWT for Authentication (over Server-Side Sessions) | Accepted |
| [ADR-005](./ADR-005-mongodb-replica-set-transactions.md) | MongoDB Replica Set for ACID Transactions | Accepted |
| [ADR-006](./ADR-006-fire-and-forget-audit-log.md) | Fire-and-Forget Audit Logging | Accepted |

---

## How to Add a New ADR

1. Copy the template below
2. Number it sequentially: `ADR-007-your-decision.md`
3. Add a row to the index above

```markdown
# ADR-XXX: Title

## Status
Proposed

## Date
YYYY-MM-DD

## Context
What problem or situation prompted this decision?

## Decision
What was decided, and how is it implemented?

## Consequences

### Positive

### Negative / Trade-offs

### Neutral
```
