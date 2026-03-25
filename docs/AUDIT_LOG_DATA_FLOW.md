# Audit Log Module — Data Flow & Architecture

This document traces every request through the audit-log module in strict chronological order,
file by file and line by line. Two flows exist:

- **READ flow** — `GET /workspaces/:workspaceId/audit-logs` (admin fetches logs)
- **WRITE flow** — any other module records an audit event (fire-and-forget side-effect)

---

## 0. Module Architecture Overview

```
HTTP Request
     │
     ▼
src/server.ts          ← starts the process, connects MongoDB, binds port
     │
     ▼
src/app.ts             ← mounts all route routers onto Express
     │
     ▼
auditLog.routes.ts     ← builds the DI graph (repo → use-case → service/controller)
     │
     ├── READ path ────────────────────────────────────────────────────────────┐
     │   authMiddleware → requireAdmin → AuditLogController                   │
     │   → GetAuditLogs (use case)                                            │
     │   → AuditLogRepositoryImpl → AuditLogModel (Mongoose)                  │
     │   → AuditLogPresenter → JSON response                                  │
     │                                                                         │
     └── WRITE path (called internally from every other module) ──────────────┘
         Other module use-case → auditLogService.log()
         → AuditLogServiceImpl → RecordAudit (use case)
         → AuditLogRepositoryImpl → AuditLogModel (Mongoose)
```

---

## 1. Process Startup — `src/server.ts`

```
src/server.ts
```

```typescript
// Line 1-2: import the configured Express app and two helpers
import app from "./app";
import { connectDB } from "./config/database";
import { env } from "./config/env";

// Line 5-11: async IIFE — ordered startup
const startServer = async () => {
  await connectDB();          // 1. open MongoDB connection pool (blocks until ready)

  app.listen(env.port, () => { // 2. bind Express to port 4000
    console.log(`Server running on port ${env.port}`);
  });
};

startServer();
```

**What happens here:**
- `connectDB()` resolves a Mongoose connection. Every Mongoose model (including
  `AuditLogModel`) registers itself against this connection automatically when the
  model file is first imported. They do NOT need an explicit "connect" call of their own.
- After the connection is up, Express begins accepting HTTP traffic on port 4000.

---

## 2. Route Mounting — `src/app.ts`

```
src/app.ts
```

```typescript
// Lines 1-9: import every module's router
import express from 'express';
import authRoutes          from './modules/auth/...';
import workspaceRoutes     from './modules/workspace/...';
import entityRoutes        from './modules/entity/...';
import documentTypeRoutes  from './modules/document-type/...';
import documentRoutes      from './modules/document/...';
import workItemRoutes      from './modules/work-item/...';
import auditLogRoutes      from './modules/audit-log/infrastructure/routes/auditLog.routes';
//     ^^^^^^^^^^^^  ← the default export from auditLog.routes.ts

import overviewRoutes from './modules/overview/...';
import { errorHandler } from './shared/interfaces/middleware/errorHandler';

// Line 13: create the Express application
const app = express();

// Line 15: parse incoming JSON bodies (makes req.body available)
app.use(express.json());

// Line 17-19: health check (bypasses all auth)
app.get('/health', (_req, res) => { res.json({ status: 'ok' }); });

// Lines 22-29: mount every router
app.use('/auth',      authRoutes);
app.use('/workspaces', workspaceRoutes);
app.use(entityRoutes);
app.use(documentTypeRoutes);
app.use(documentRoutes);
app.use(workItemRoutes);
app.use(auditLogRoutes);   // ← registers GET /workspaces/:workspaceId/audit-logs
app.use(overviewRoutes);

// Line 32: global error handler — MUST be last
app.use(errorHandler);

export default app;
```

**Key point:** `import auditLogRoutes from '...'` causes Node.js to **execute**
`auditLog.routes.ts` at startup. That module-level code instantiates the entire DI
graph for the audit-log module (repo, use cases, service, controller) before the
first request ever arrives.

---

## 3. Dependency Injection at Startup — `auditLog.routes.ts`

```
src/modules/audit-log/infrastructure/routes/auditLog.routes.ts
```

This file runs **once at import time** to wire everything together.

```typescript
// Lines 1-13: import all pieces
import { Router } from 'express';
import { AuditLogController }     from '../../interfaces/http/AuditLogController';
import { AuditLogPresenter }      from '../../interfaces/presenters/AuditLogPresenter';
import { GetAuditLogs }           from '../../application/use-cases/GetAuditLogs';
import { RecordAudit }            from '../../application/use-cases/RecordAudit';
import { AuditLogRepositoryImpl } from '../mongoose/AuditLogRepositoryImpl';
import { AuditLogServiceImpl }    from '../mongoose/AuditLogServiceImpl';
import { authMiddleware }         from '../../../../common/middleware/auth.middleware';
import { requireAdmin }           from '../../../../common/middleware/rbac.middleware';

const router = Router();

// Step 1 — Infrastructure: create the Mongoose-backed repository
const auditLogRepo = new AuditLogRepositoryImpl();
//    auditLogRepo knows how to CREATE and QUERY AuditLog documents in MongoDB

// Step 2a — Application: write use case (records a single audit event)
const recordAuditUC = new RecordAudit(auditLogRepo);

// Step 2b — Application: read use case (fetches a filtered + paginated list)
const getAuditLogsUC = new GetAuditLogs(auditLogRepo);

// Step 3 — Service (wraps recordAuditUC with silent error handling)
//   Exported so OTHER module route files can import and inject it into their
//   own use cases. This is the only "cross-module" coupling point.
export const auditLogService = new AuditLogServiceImpl(recordAuditUC);

// Step 4 — Interfaces: controller + presenter
const presenter  = new AuditLogPresenter();
const controller = new AuditLogController(getAuditLogsUC, presenter);

// Step 5 — Register the single HTTP route
router.get(
    '/workspaces/:workspaceId/audit-logs',
    authMiddleware,   // ← runs first: validates JWT, attaches req.user
    requireAdmin,     // ← runs second: checks user is OWNER or ADMIN of the workspace
    controller.getAuditLogs  // ← runs third: business logic
);

export default router;
```

---

## ── READ FLOW ──────────────────────────────────────────────────────────────

### 4. Auth Middleware — `common/middleware/auth.middleware.ts`

**When:** every request to `/workspaces/:workspaceId/audit-logs`

```typescript
// Pseudocode of what authMiddleware does:
// 1. Reads Authorization header → extracts Bearer token
// 2. Verifies JWT signature against JWT_SECRET
// 3. Decodes payload → attaches as req.user = { id, email, ... }
// 4. Calls next() on success, or returns 401 on failure
```

After `authMiddleware`, `req.user.id` is guaranteed to be the authenticated user's ID.

---

### 5. RBAC Middleware — `common/middleware/rbac.middleware.ts`

**When:** after `authMiddleware` passes

```typescript
// requireAdmin pseudocode:
// 1. Reads workspaceId from req.params.workspaceId
// 2. Looks up the workspace membership for req.user.id
// 3. Checks role ∈ { OWNER, ADMIN }
// 4. Calls next() if allowed, or returns 403 if not
```

If the user is a plain MEMBER, the request is rejected here with 403. No audit
code ever runs.

---

### 6. Controller — `interfaces/http/AuditLogController.ts`

**When:** after both middleware pass

```typescript
// Constructor (runs at startup, not per-request)
constructor(
    private readonly getAuditLogsUC: GetAuditLogs,  // injected
    private readonly presenter: AuditLogPresenter    // injected
) {
    // bind() is required so 'this' refers to the class instance
    // when Express calls the method as a plain function reference
    this.getAuditLogs = this.getAuditLogs.bind(this);
}

async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        // 1. Extract :workspaceId from URL path
        const workspaceId = req.params.workspaceId as string;

        // 2. Helper: safely read query params (ignores array values from ?x=1&x=2)
        const qs = (key: string): string | undefined => {
            const v = req.query[key];
            return typeof v === 'string' ? v : undefined;
        };

        // 3. Build the filters DTO from query string
        //    Dates arrive as ISO strings; limit/offset arrive as strings too
        const filtersDTO: AuditLogFiltersDTO = {
            userId:     qs('userId'),     // ?userId=abc123
            action:     qs('action'),     // ?action=DOCUMENT_UPLOADED
            targetType: qs('targetType'), // ?targetType=Document
            targetId:   qs('targetId'),   // ?targetId=xyz
            fromDate:   qs('fromDate'),   // ?fromDate=2024-01-01T00:00:00Z
            toDate:     qs('toDate'),     // ?toDate=2024-12-31T23:59:59Z
            limit:  limitStr  ? Number(limitStr)  : undefined, // default applied later
            offset: offsetStr ? Number(offsetStr) : undefined, // default applied later
        };

        // 4. Delegate to use case
        const result = await this.getAuditLogsUC.execute(workspaceId, filtersDTO);

        // 5. Format and send response
        res.status(200).json(this.presenter.presentAuditLogs(result, filtersDTO));
    } catch (error) {
        next(error); // forwards to the global errorHandler in app.ts
    }
}
```

---

### 7. Use Case — `application/use-cases/GetAuditLogs.ts`

```typescript
constructor(private readonly auditLogRepo: IAuditLogRepository) { }

async execute(
    workspaceId: string,
    filtersDTO: AuditLogFiltersDTO
): Promise<{ logs: AuditLog[]; total: number }> {

    // 1. Convert DTO (HTTP-friendly types) → domain filters (native types)
    const filters: AuditLogFilters = {
        userId:     filtersDTO.userId,
        action:     filtersDTO.action,
        targetType: filtersDTO.targetType,
        targetId:   filtersDTO.targetId,
        fromDate: filtersDTO.fromDate ? new Date(filtersDTO.fromDate) : undefined,
        toDate:   filtersDTO.toDate   ? new Date(filtersDTO.toDate)   : undefined,
        limit:  filtersDTO.limit  ? Number(filtersDTO.limit)  : 50,  // default 50
        offset: filtersDTO.offset ? Number(filtersDTO.offset) : 0,   // default 0
    };

    // 2. Run data fetch and count in PARALLEL for efficiency
    const [logs, total] = await Promise.all([
        this.auditLogRepo.findByWorkspace(workspaceId, filters),
        this.auditLogRepo.countByWorkspace(workspaceId, filters),
    ]);

    // 3. Return plain domain objects (no HTTP concerns here)
    return { logs, total };
}
```

**Why `Promise.all`?** Both queries hit MongoDB independently. Running them in
parallel halves the latency compared to awaiting them sequentially.

---

### 8. Repository — `infrastructure/mongoose/AuditLogRepositoryImpl.ts`

The repository translates between the domain layer and MongoDB.

#### 8a. `findByWorkspace`

```typescript
async findByWorkspace(workspaceId: string, filters?: AuditLogFilters): Promise<AuditLog[]> {
    // 1. Build Mongoose query object from filters
    const query = this.buildQuery(workspaceId, filters);

    // 2. Execute query with sort + pagination
    const docs = await AuditLogModel
        .find(query)
        .sort({ createdAt: -1 })   // newest first
        .skip(filters?.offset ?? 0)
        .limit(filters?.limit ?? 50);

    // 3. Map each Mongoose document to a domain AuditLog entity
    return docs.map((doc) => this.toEntity(doc));
}
```

#### 8b. `countByWorkspace`

```typescript
async countByWorkspace(workspaceId: string, filters?: AuditLogFilters): Promise<number> {
    const query = this.buildQuery(workspaceId, filters); // same filter object
    return AuditLogModel.countDocuments(query);
    // Note: countDocuments does NOT apply skip/limit — it counts ALL matching docs
}
```

#### 8c. `buildQuery` (private helper)

```typescript
private buildQuery(workspaceId: string, filters?: AuditLogFilters): Record<string, any> {
    // Always scope to the requested workspace
    const query: Record<string, any> = { workspaceId };

    // Exact-match filters (all optional)
    if (filters?.userId)     query.userId     = filters.userId;
    if (filters?.action)     query.action     = filters.action;
    if (filters?.targetType) query.targetType = filters.targetType;
    if (filters?.targetId)   query.targetId   = filters.targetId;

    // Date range filter on createdAt
    if (filters?.fromDate || filters?.toDate) {
        query.createdAt = {};
        if (filters.fromDate) query.createdAt.$gte = filters.fromDate; // ≥ fromDate
        if (filters.toDate)   query.createdAt.$lte = filters.toDate;   // ≤ toDate
    }

    return query;
}
```

#### 8d. `toEntity` (private mapper)

```typescript
private toEntity(doc: any): AuditLog {
    // Mongoose _id is an ObjectId → convert to plain string for domain layer
    return new AuditLog(
        doc._id.toString(),
        doc.workspaceId.toString(),
        doc.userId.toString(),
        doc.action as AuditAction,
        doc.targetType,
        doc.targetId ?? undefined, // null in Mongo → undefined in domain
        doc.createdAt,
    );
}
```

---

### 9. Mongoose Model — `infrastructure/mongoose/AuditLogModel.ts`

This is the lowest layer — it defines the MongoDB collection schema.

```typescript
const AuditLogSchema = new Schema<IAuditLogDocument>(
    {
        workspaceId: { type: Schema.Types.ObjectId, required: true, ref: 'Workspace', index: true },
        userId:      { type: Schema.Types.ObjectId, required: true, ref: 'User',      index: true },
        action:      { type: String, required: true },
        targetType:  { type: String, required: true },
        targetId:    { type: String, default: null }, // nullable
    },
    {
        // Only createdAt — audit logs are immutable (no updatedAt)
        timestamps: { createdAt: 'createdAt', updatedAt: false },
    }
);

// Compound indexes for the most common query patterns:
AuditLogSchema.index({ workspaceId: 1, createdAt: -1 }); // primary: recent logs per workspace
AuditLogSchema.index({ workspaceId: 1, userId: 1 });      // filter by actor
AuditLogSchema.index({ workspaceId: 1, action: 1 });      // filter by action type
```

MongoDB executes the query here and returns raw BSON documents.

---

### 10. Presenter — `interfaces/presenters/AuditLogPresenter.ts`

```typescript
presentAuditLogs(
    result: { logs: AuditLog[]; total: number },
    filters: AuditLogFiltersDTO
) {
    return {
        total:  result.total,
        limit:  filters.limit  ?? 50,  // echo back effective limit
        offset: filters.offset ?? 0,   // echo back effective offset
        logs:   result.logs.map((log) => this.presentAuditLog(log)),
    };
}

presentAuditLog(log: AuditLog) {
    return {
        id:          log.id,
        workspaceId: log.workspaceId,
        userId:      log.userId,
        action:      log.action,      // e.g. "DOCUMENT_UPLOADED"
        targetType:  log.targetType,  // e.g. "Document"
        targetId:    log.targetId ?? null, // undefined → null for JSON
        createdAt:   log.createdAt,
    };
}
```

---

### 11. HTTP Response

Express serialises the presenter output as JSON and sends it to the client:

```json
{
  "total": 142,
  "limit": 50,
  "offset": 0,
  "logs": [
    {
      "id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "workspaceId": "65f0...",
      "userId": "65f0...",
      "action": "DOCUMENT_UPLOADED",
      "targetType": "Document",
      "targetId": "65f2...",
      "createdAt": "2024-03-13T10:22:00.000Z"
    },
    ...
  ]
}
```

---

## ── WRITE FLOW ──────────────────────────────────────────────────────────────

Audit events are written as **a side-effect** of every mutation in the system
(create entity, upload document, change work item status, etc.). The audit-log
module exports a singleton `auditLogService` that other modules import.

### Step 1 — Other Module Imports `auditLogService`

Example from `workItem.routes.ts` (or any other module's route file):

```typescript
// At startup, when workItem.routes.ts is first imported:
import { auditLogService } from '../../audit-log/infrastructure/routes/auditLog.routes';

// auditLogService is the same singleton constructed in Section 3 above.
// It is passed into every use case that performs a write:
const createWorkItemUC = new CreateWorkItem(workItemRepo, auditLogService);
//                                                        ^^^^^^^^^^^^^^^^
//                                       injected as optional IAuditLogService
```

---

### Step 2 — Other Module's Use Case Calls `auditLogService.log()`

Inside (e.g.) `CreateWorkItem.execute()`:

```typescript
// After successfully creating the work item in its own repository:
const workItem = await this.workItemRepo.create(...);

// Fire-and-forget: never await in a way that blocks the response
await this.auditLogService?.log({
    workspaceId: dto.workspaceId,
    userId:      dto.createdBy,
    action:      AuditAction.WORK_ITEM_CREATED,
    targetType:  'WorkItem',
    targetId:    workItem.id,
});
// Even if this throws internally, AuditLogServiceImpl catches it silently.
// The calling use case never sees an error from audit logging.
```

---

### Step 3 — Service — `infrastructure/mongoose/AuditLogServiceImpl.ts`

```typescript
async log(dto: CreateAuditLogDTO): Promise<void> {
    try {
        // Delegate to the use case
        await this.recordAuditUC.execute(dto);
    } catch (error) {
        // CRITICAL: swallow all errors
        // Audit failure must NEVER fail the calling operation
        console.error('[AuditLog] Failed to record audit log:', error);
    }
}
```

This is the **firewall**: any MongoDB error (network timeout, validation failure,
duplicate key) is caught here and only logged to stderr. The outer use case
resumes normally and sends its HTTP response.

---

### Step 4 — Use Case — `application/use-cases/RecordAudit.ts`

```typescript
async execute(dto: CreateAuditLogDTO): Promise<AuditLog> {
    // Pass through to repository, adding createdAt timestamp
    return this.auditLogRepo.create({
        workspaceId: dto.workspaceId,
        userId:      dto.userId,
        action:      dto.action,
        targetType:  dto.targetType,
        targetId:    dto.targetId,
        createdAt:   new Date(),  // set to "now" at write time
    });
}
```

---

### Step 5 — Repository — `AuditLogRepositoryImpl.create()`

```typescript
async create(log: Omit<AuditLog, 'id'>): Promise<AuditLog> {
    // AuditLogModel.create() performs a MongoDB insertOne
    const doc = await AuditLogModel.create({
        workspaceId: log.workspaceId,
        userId:      log.userId,
        action:      log.action,
        targetType:  log.targetType,
        targetId:    log.targetId,
        // createdAt is auto-set by Mongoose timestamps: { createdAt: 'createdAt' }
    });

    // Map the saved document back to a domain entity and return it
    return this.toEntity(doc);
}
```

MongoDB inserts the document. The compound index `{ workspaceId: 1, createdAt: -1 }`
is updated by MongoDB automatically.

---

## Domain Layer Reference

These files define **pure types** — no I/O, no side effects.

### `domain/entities/AuditLog.ts`

```typescript
export class AuditLog {
    constructor(
        public readonly id:          string,
        public readonly workspaceId: string,
        public readonly userId:      string,             // who did it
        public readonly action:      AuditAction,        // what they did
        public readonly targetType:  string,             // kind of resource affected
        public readonly targetId:    string | undefined, // which resource (nullable)
        public readonly createdAt:   Date
    ) { }
}
```

All fields are `readonly` — the domain entity is immutable after construction.

### `domain/enums/AuditAction.ts`

24 action constants covering every mutation in the system:

| Category      | Actions                                                                 |
|---------------|-------------------------------------------------------------------------|
| Auth          | `USER_SIGNUP`, `USER_LOGIN`                                             |
| Workspace     | `WORKSPACE_CREATED`, `WORKSPACE_MEMBER_INVITED/REMOVED/ROLE_UPDATED`   |
| Entity        | `ENTITY_CREATED/UPDATED/DELETED`                                        |
| Document Type | `DOCUMENT_TYPE_CREATED/UPDATED/DELETED/FIELD_ADDED`                    |
| Document      | `DOCUMENT_UPLOADED/UPDATED/DELETED`                                     |
| Work Item     | `WORK_ITEM_TYPE_CREATED/DELETED`, `WORK_ITEM_CREATED/UPDATED/STATUS_CHANGED/DELETED/DOCUMENT_LINKED/UNLINKED` |

### `domain/repositories/IAuditLogRepository.ts`

```typescript
export interface IAuditLogRepository {
    create(log: Omit<AuditLog, 'id'>): Promise<AuditLog>;
    findByWorkspace(workspaceId: string, filters?: AuditLogFilters): Promise<AuditLog[]>;
    countByWorkspace(workspaceId: string, filters?: AuditLogFilters): Promise<number>;
}
```

The interface lives in the domain layer. The implementation (`AuditLogRepositoryImpl`)
lives in infrastructure. This means the domain never imports Mongoose — the
dependency arrow points inward only.

### `application/services/IAuditLogService.ts`

```typescript
export interface IAuditLogService {
    log(dto: CreateAuditLogDTO): Promise<void>;
}
```

Other modules depend on this interface (not the concrete `AuditLogServiceImpl`),
keeping them decoupled from infrastructure details.

---

## Complete Chronological Call Stack

### READ — `GET /workspaces/:id/audit-logs`

```
HTTP GET /workspaces/abc/audit-logs?action=DOCUMENT_UPLOADED&limit=10
  │
  ├─ 1. src/server.ts:app.listen()          → accepts TCP connection
  ├─ 2. src/app.ts:app.use(auditLogRoutes)  → matches route
  ├─ 3. authMiddleware                       → verifies JWT, sets req.user
  ├─ 4. requireAdmin                         → checks workspace membership role
  ├─ 5. AuditLogController.getAuditLogs()
  │      ├─ extracts workspaceId from req.params
  │      ├─ extracts filters from req.query
  │      └─ calls getAuditLogsUC.execute(workspaceId, filtersDTO)
  │
  ├─ 6. GetAuditLogs.execute()
  │      ├─ converts strings → Date objects, applies defaults (limit=50, offset=0)
  │      └─ Promise.all([
  │              auditLogRepo.findByWorkspace(workspaceId, filters),
  │              auditLogRepo.countByWorkspace(workspaceId, filters)
  │         ])
  │
  ├─ 7. AuditLogRepositoryImpl.findByWorkspace()
  │      ├─ buildQuery() → { workspaceId, action: 'DOCUMENT_UPLOADED', ... }
  │      ├─ AuditLogModel.find(query).sort({createdAt:-1}).skip(0).limit(10)
  │      └─ toEntity() × N → AuditLog[]
  │
  ├─ 8. AuditLogRepositoryImpl.countByWorkspace()
  │      ├─ buildQuery() → same filter object
  │      └─ AuditLogModel.countDocuments(query) → number
  │
  ├─ 9. AuditLogPresenter.presentAuditLogs()
  │      └─ { total, limit, offset, logs: [...] }
  │
  └─ 10. res.status(200).json(...)          → HTTP 200 response
```

### WRITE — Audit event from another module

```
POST /workspaces/abc/work-items  (CreateWorkItem flow, simplified)
  │
  ├─ 1. CreateWorkItem use case runs its own logic
  ├─ 2. workItemRepo.create() → saves the work item to MongoDB
  ├─ 3. auditLogService.log({ action: WORK_ITEM_CREATED, ... })
  │      └─ AuditLogServiceImpl.log()
  │           ├─ try:
  │           │   recordAuditUC.execute(dto)
  │           │     └─ auditLogRepo.create({ ...dto, createdAt: new Date() })
  │           │           └─ AuditLogModel.create() → MongoDB insertOne
  │           └─ catch(error): console.error(...)  ← swallowed, never rethrows
  │
  └─ 4. CreateWorkItem returns normally → HTTP 201 response
```

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| `auditLogService` exported as singleton | Allows injection into all other modules without a DI container |
| `IAuditLogService.log()` never throws | Audit failure must not break user-facing operations |
| `AuditLogServiceImpl` swallows errors | Single place to enforce the "never throw" contract |
| `Promise.all` in `GetAuditLogs` | Fetches data and count in parallel, halving query latency |
| `timestamps: { updatedAt: false }` | Audit logs are append-only; an updatedAt field would be misleading |
| Compound indexes on `workspaceId` | All queries are workspace-scoped; compound indexes avoid full collection scans |
| Domain entity is immutable (`readonly`) | Prevents accidental mutation of fetched records |
| `IAuditLogRepository` in domain layer | Infrastructure (Mongoose) depends on domain, not the other way around |
