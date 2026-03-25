# ADR-003: Manual Dependency Injection (over DI Container)

## Status
Accepted

## Date
2026-03-23

## Context

Clean Architecture requires Dependency Injection — Use Cases must receive their repository dependencies from outside, not construct them internally. This keeps Use Cases testable and decoupled from infrastructure.

Two approaches were evaluated:

1. **Manual DI:** Construct dependencies explicitly in the route files.
   ```typescript
   // document.routes.ts
   const repo = new MongoDocumentRepository();
   const useCase = new UploadDocument(repo, docTypeRepo, entityRepo, auditLogService);
   const controller = new DocumentController(useCase);
   router.post('/', authMiddleware, requireMember, controller.upload);
   ```

2. **DI Container (tsyringe / InversifyJS):** Use decorators and a container registry to wire dependencies automatically.
   ```typescript
   @injectable()
   class UploadDocument {
     constructor(
       @inject('IDocumentRepository') private repo: IDocumentRepository
     ) {}
   }
   container.register('IDocumentRepository', MongoDocumentRepository);
   ```

## Decision

Use **manual Dependency Injection** in `*.routes.ts` files for the MVP.

The team is learning Clean Architecture patterns for the first time on this project. A DI container adds:
- TypeScript decorator metadata (`reflect-metadata` import, `experimentalDecorators` in tsconfig)
- Non-obvious "magic" — it's not clear from reading a Use Case where its dependencies come from
- An additional library to learn alongside the architecture pattern itself

Manual DI is explicit, fully readable, and requires no additional dependencies. Each route file is the single place to see exactly how all dependencies for that module are wired.

## Consequences

### Positive
- Zero additional dependencies — no tsyringe, InversifyJS, or reflect-metadata
- Fully explicit wiring — reading `document.routes.ts` shows exactly what is injected where
- No TypeScript decorator configuration required
- Easier to debug — no container magic, no registration errors

### Negative / Trade-offs
- Repetitive boilerplate in route files — each module's route file manually constructs 3–5 objects
- Does not scale well beyond ~15 modules — route files become long
- Circular dependency detection is manual (no container to warn you)

### Neutral
- Migration path to a DI container is straightforward: all interfaces already exist in the Domain layer, so `@inject('IDocumentRepository')` decorators can be added incrementally
- Recommended container for future migration: **tsyringe** (lightweight, good TypeScript support, fewer concepts than InversifyJS)
