# ADR-001: Clean Architecture Pattern

## Status
Accepted

## Date
2026-03-23

## Context

The initial backend approach was a flat MVC structure — controllers calling Mongoose models directly. As the project grew to 8 modules (auth, workspace, entity, document-type, document, work-item, audit-log, overview), several problems emerged:

- Business logic was scattered across controllers, making it hard to locate and change rules
- Testing required a running Express server and MongoDB — no unit testing of logic in isolation
- Any change to the HTTP layer (e.g. Express version upgrade) risked breaking business logic
- The codebase was becoming hard to onboard new developers to

The team needed a structural pattern that would enforce clean separation between HTTP concerns, business logic, and data access.

## Decision

Adopt **Clean Architecture** (Robert C. Martin) with four concentric layers and a strict dependency rule: dependencies only point inward.

```
Infrastructure → Interfaces → Application → Domain
(Mongoose/AWS)   (Controllers) (Use Cases)  (Pure Business Logic)
```

- **Domain:** Pure TypeScript entities and repository interfaces. No imports from Express, Mongoose, or any library.
- **Application:** Use Cases — one class per operation. Depends only on Domain interfaces.
- **Interfaces:** HTTP Controllers and middleware. Framework-aware but no business logic.
- **Infrastructure:** Mongoose models, repository implementations, route wiring, DI.

Each of the 8 modules follows this exact folder structure independently.

## Consequences

### Positive
- Use Cases are testable by injecting mock repositories — no running database required
- The HTTP framework (Express) can be swapped by changing only the Interfaces layer
- The database (MongoDB) can be swapped by changing only the Infrastructure layer
- Business rules live in one place — easy to find and change
- New modules can be added without touching existing modules

### Negative / Trade-offs
- More files and folders per feature than flat MVC — higher initial setup cost
- More boilerplate: interfaces must be defined in Domain before implementations in Infrastructure
- Steeper learning curve for developers unfamiliar with the pattern

### Neutral
- Manual Dependency Injection in `*.routes.ts` files (see ADR-003) — DI container is a future option once team is comfortable with the pattern
