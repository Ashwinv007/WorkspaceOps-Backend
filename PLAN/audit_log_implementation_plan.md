# Audit Log Module — Detailed Implementation Plan

**HLRs:** HLR0026-0027  
**Module Path:** `src/modules/audit-log/`  
**Estimated Time:** 2-3 days  
**Status:** ⬜ Not Started  
**Last Updated:** February 19, 2026

---

## Overview

The Audit Log module is a **cross-cutting concern** — it records who did what, when, and to which entity across every write operation in the system. This is the only module where the implementation pattern deviates slightly from previous modules: instead of injecting use case dependencies through routes, we inject a shared **AuditLogService** into each module's use cases.

### HLR Requirements

| HLR | Requirement |
|-----|-------------|
| **HLR0026** | The system MUST record audit logs for all key write actions across modules |
| **HLR0027** | Each log MUST capture: actor (`userId`), action type, target type, target ID, workspace ID, and timestamp |

---

## Architecture Decision

### Approach: Singleton Service Injection

> The Audit Log module is NOT a pure standalone module. It is a **shared service** used by all other modules' use cases.

```
Route (DI wiring)
  └── CreateWorkItem use case
        ├── IWorkItemRepository (existing)
        └── IAuditLogService  ← NEW: injected into use cases
              └── AuditLogServiceImpl
                    └── IAuditLogRepository
                          └── AuditLogRepositoryImpl (Mongoose)
```

**Why not middleware?**  
Middleware operates at HTTP level and doesn't have access to domain context (entity IDs, types). Use case injection gives us full context.

**Why not database hooks?**  
Mongoose hooks are hard to test and couple infrastructure to audit logic.

---

## Folder Structure

```
src/modules/audit-log/
├── domain/
│   ├── entities/
│   │   └── AuditLog.ts              # Domain entity
│   ├── enums/
│   │   └── AuditAction.ts           # Action type enum
│   └── repositories/
│       └── IAuditLogRepository.ts   # Repository interface
├── application/
│   ├── dto/
│   │   └── AuditLogDTO.ts           # Filter DTO for GET queries
│   ├── services/
│   │   └── IAuditLogService.ts      # Interface injected into use cases
│   └── use-cases/
│       ├── RecordAudit.ts           # Write use case
│       └── GetAuditLogs.ts          # Read use case (Admin only)
├── interfaces/
│   ├── http/
│   │   └── AuditLogController.ts
│   └── presenters/
│       └── AuditLogPresenter.ts
└── infrastructure/
    ├── mongoose/
    │   ├── AuditLogModel.ts
    │   ├── AuditLogRepositoryImpl.ts
    │   └── AuditLogServiceImpl.ts   # Concrete service
    └── routes/
        └── auditLog.routes.ts
```

---

## Domain Layer

### AuditAction Enum

**File:** `domain/enums/AuditAction.ts`

```typescript
export enum AuditAction {
  // Auth
  USER_SIGNUP = 'USER_SIGNUP',
  USER_LOGIN = 'USER_LOGIN',

  // Workspace
  WORKSPACE_CREATED = 'WORKSPACE_CREATED',
  WORKSPACE_MEMBER_INVITED = 'WORKSPACE_MEMBER_INVITED',
  WORKSPACE_MEMBER_REMOVED = 'WORKSPACE_MEMBER_REMOVED',
  WORKSPACE_MEMBER_ROLE_UPDATED = 'WORKSPACE_MEMBER_ROLE_UPDATED',

  // Entity
  ENTITY_CREATED = 'ENTITY_CREATED',
  ENTITY_UPDATED = 'ENTITY_UPDATED',
  ENTITY_DELETED = 'ENTITY_DELETED',

  // Document Type
  DOCUMENT_TYPE_CREATED = 'DOCUMENT_TYPE_CREATED',
  DOCUMENT_TYPE_UPDATED = 'DOCUMENT_TYPE_UPDATED',
  DOCUMENT_TYPE_DELETED = 'DOCUMENT_TYPE_DELETED',
  DOCUMENT_TYPE_FIELD_ADDED = 'DOCUMENT_TYPE_FIELD_ADDED',

  // Document
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_UPDATED = 'DOCUMENT_UPDATED',
  DOCUMENT_DELETED = 'DOCUMENT_DELETED',

  // Work Item
  WORK_ITEM_TYPE_CREATED = 'WORK_ITEM_TYPE_CREATED',
  WORK_ITEM_TYPE_DELETED = 'WORK_ITEM_TYPE_DELETED',
  WORK_ITEM_CREATED = 'WORK_ITEM_CREATED',
  WORK_ITEM_UPDATED = 'WORK_ITEM_UPDATED',
  WORK_ITEM_STATUS_CHANGED = 'WORK_ITEM_STATUS_CHANGED',
  WORK_ITEM_DELETED = 'WORK_ITEM_DELETED',
  WORK_ITEM_DOCUMENT_LINKED = 'WORK_ITEM_DOCUMENT_LINKED',
  WORK_ITEM_DOCUMENT_UNLINKED = 'WORK_ITEM_DOCUMENT_UNLINKED',
}
```

### AuditLog Entity

**File:** `domain/entities/AuditLog.ts`

> **Schema alignment with SQL `audit_logs` table (field-by-field):**
>
> | SQL Column | TypeScript Field | Type | Notes |
> |---|---|---|---|
> | `id` | `id` | `string` | `_id` in MongoDB |
> | `workspace_id` | `workspaceId` | `string` | required |
> | `user_id` | `userId` | `string` | required — the actor |
> | `action` | `action` | `AuditAction` | required |
> | `target_type` | `targetType` | `string` | required |
> | `target_id` | `targetId` | `string \| undefined` | nullable in SQL |
> | `created_at` | `createdAt` | `Date` | auto-set, same as all other modules |

```typescript
import { AuditAction } from '../enums/AuditAction';

export class AuditLog {
  constructor(
    public readonly id: string,
    public readonly workspaceId: string,
    public readonly userId: string,              // SQL: user_id
    public readonly action: AuditAction,          // SQL: action VARCHAR(100)
    public readonly targetType: string,           // SQL: target_type VARCHAR(50)
    public readonly targetId: string | undefined, // SQL: target_id UUID (nullable)
    public readonly createdAt: Date               // SQL: created_at
  ) {}
}
```

### IAuditLogRepository

**File:** `domain/repositories/IAuditLogRepository.ts`

```typescript
import { AuditLog } from '../entities/AuditLog';

export interface AuditLogFilters {
  userId?: string;       // SQL: user_id
  action?: string;       // SQL: action
  targetType?: string;   // SQL: target_type
  targetId?: string;     // SQL: target_id
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface IAuditLogRepository {
  create(log: Omit<AuditLog, 'id'>): Promise<AuditLog>;
  findByWorkspace(workspaceId: string, filters?: AuditLogFilters): Promise<AuditLog[]>;
  countByWorkspace(workspaceId: string, filters?: AuditLogFilters): Promise<number>;
}
```

---

## Application Layer

### IAuditLogService (Interface used by all use cases)

**File:** `application/services/IAuditLogService.ts`

```typescript
import { AuditAction } from '../../domain/enums/AuditAction';

export interface CreateAuditLogDTO {
  workspaceId: string;
  userId: string;        // SQL: user_id
  action: AuditAction;
  targetType: string;    // SQL: target_type VARCHAR(50)
  targetId?: string;     // SQL: target_id UUID (nullable)
}

export interface IAuditLogService {
  log(dto: CreateAuditLogDTO): Promise<void>;
}
```

> **Design Rule:** `IAuditLogService.log()` must NEVER throw or crash the calling use case. It logs silently on failure. Write operations must not be blocked by audit failures.

### RecordAudit Use Case

**File:** `application/use-cases/RecordAudit.ts`

```typescript
import { IAuditLogRepository } from '../../domain/repositories/IAuditLogRepository';
import { CreateAuditLogDTO } from '../services/IAuditLogService';
import { AuditLog } from '../../domain/entities/AuditLog';

export class RecordAudit {
  constructor(private readonly auditLogRepo: IAuditLogRepository) {}

  async execute(dto: CreateAuditLogDTO): Promise<AuditLog> {
    return this.auditLogRepo.create({
      workspaceId: dto.workspaceId,
      userId: dto.userId,
      action: dto.action,
      targetType: dto.targetType,
      targetId: dto.targetId,
      createdAt: new Date(),
    });
  }
}
```

### GetAuditLogs Use Case

**File:** `application/use-cases/GetAuditLogs.ts`

```typescript
import { IAuditLogRepository, AuditLogFilters } from '../../domain/repositories/IAuditLogRepository';
import { AuditLog } from '../../domain/entities/AuditLog';

export class GetAuditLogs {
  constructor(private readonly auditLogRepo: IAuditLogRepository) {}

  async execute(workspaceId: string, filters: AuditLogFilters): Promise<{
    logs: AuditLog[];
    total: number;
  }> {
    const [logs, total] = await Promise.all([
      this.auditLogRepo.findByWorkspace(workspaceId, filters),
      this.auditLogRepo.countByWorkspace(workspaceId, filters),
    ]);
    return { logs, total };
  }
}
```

### AuditLogDTO

**File:** `application/dto/AuditLogDTO.ts`

```typescript
// Used by AuditLogController to parse query params
export interface AuditLogFiltersDTO {
  userId?: string;      // SQL: user_id
  action?: string;      // SQL: action
  targetType?: string;  // SQL: target_type
  targetId?: string;    // SQL: target_id
  fromDate?: string;    // ISO date string from query param → converted to Date
  toDate?: string;
  limit?: number;
  offset?: number;
}
```

---

## Infrastructure Layer

### AuditLogModel (Mongoose)

**File:** `infrastructure/mongoose/AuditLogModel.ts`

```typescript
import mongoose, { Schema, Document } from 'mongoose';

/**
 * AuditLog Mongoose Model
 *
 * Maps to SQL: audit_logs
 * {
 *   id            → _id (ObjectId),
 *   workspace_id  → workspaceId (ObjectId ref Workspace),
 *   user_id       → userId (ObjectId ref User),
 *   action        → action (String, required),
 *   target_type   → targetType (String, required),
 *   target_id     → targetId (String, nullable),
 *   created_at    → createdAt (via timestamps)
 * }
 */

export interface IAuditLogDocument extends Document {
  workspaceId: mongoose.Types.ObjectId;  // SQL: workspace_id
  userId: mongoose.Types.ObjectId;       // SQL: user_id
  action: string;                        // SQL: action VARCHAR(100)
  targetType: string;                    // SQL: target_type VARCHAR(50)
  targetId?: string;                     // SQL: target_id UUID (nullable)
  createdAt: Date;                       // SQL: created_at
}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    workspaceId: { type: Schema.Types.ObjectId, required: true, ref: 'Workspace', index: true },
    userId:      { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    action:      { type: String, required: true },
    targetType:  { type: String, required: true },
    targetId:    { type: String, default: null }, // nullable, like SQL
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } } // append-only: no updatedAt
);

// Compound indexes for efficient workspace-level queries
AuditLogSchema.index({ workspaceId: 1, createdAt: -1 }); // primary access pattern
AuditLogSchema.index({ workspaceId: 1, userId: 1 });
AuditLogSchema.index({ workspaceId: 1, action: 1 });

export const AuditLogModel = mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);
```

### AuditLogRepositoryImpl

**File:** `infrastructure/mongoose/AuditLogRepositoryImpl.ts`

```typescript
import { IAuditLogRepository, AuditLogFilters } from '../../domain/repositories/IAuditLogRepository';
import { AuditLog } from '../../domain/entities/AuditLog';
import { AuditLogModel } from './AuditLogModel';
import { AuditAction } from '../../domain/enums/AuditAction';

export class AuditLogRepositoryImpl implements IAuditLogRepository {
  async create(log: Omit<AuditLog, 'id'>): Promise<AuditLog> {
    const doc = await AuditLogModel.create({
      workspaceId: log.workspaceId,
      userId:      log.userId,
      action:      log.action,
      targetType:  log.targetType,
      targetId:    log.targetId ?? null,
    });
    return this.toEntity(doc);
  }

  async findByWorkspace(workspaceId: string, filters?: AuditLogFilters): Promise<AuditLog[]> {
    const query = this.buildQuery(workspaceId, filters);
    const docs = await AuditLogModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(filters?.offset ?? 0)
      .limit(filters?.limit ?? 50);
    return docs.map(this.toEntity);
  }

  async countByWorkspace(workspaceId: string, filters?: AuditLogFilters): Promise<number> {
    return AuditLogModel.countDocuments(this.buildQuery(workspaceId, filters));
  }

  private buildQuery(workspaceId: string, filters?: AuditLogFilters) {
    const query: Record<string, any> = { workspaceId };
    if (filters?.userId)     query.userId     = filters.userId;
    if (filters?.action)     query.action     = filters.action;
    if (filters?.targetType) query.targetType = filters.targetType;
    if (filters?.targetId)   query.targetId   = filters.targetId;
    if (filters?.fromDate || filters?.toDate) {
      query.createdAt = {};
      if (filters.fromDate) query.createdAt.$gte = filters.fromDate;
      if (filters.toDate)   query.createdAt.$lte = filters.toDate;
    }
    return query;
  }

  private toEntity(doc: any): AuditLog {
    return new AuditLog(
      doc._id.toString(),
      doc.workspaceId.toString(),
      doc.userId.toString(),
      doc.action as AuditAction,
      doc.targetType,
      doc.targetId ?? undefined,
      doc.createdAt,
    );
  }
}
```

### AuditLogServiceImpl (Concrete Service)

**File:** `infrastructure/mongoose/AuditLogServiceImpl.ts`

```typescript
import { IAuditLogService, CreateAuditLogDTO } from '../../application/services/IAuditLogService';
import { RecordAudit } from '../../application/use-cases/RecordAudit';

export class AuditLogServiceImpl implements IAuditLogService {
  constructor(private readonly recordAuditUC: RecordAudit) {}

  async log(dto: CreateAuditLogDTO): Promise<void> {
    try {
      await this.recordAuditUC.execute(dto);
    } catch (error) {
      // Silent failure: audit log must NEVER break the main flow
      console.error('[AuditLog] Failed to record audit log:', error);
    }
  }
}
```

---

## Interfaces Layer

### AuditLogController

**File:** `interfaces/http/AuditLogController.ts`

```typescript
// Endpoint: GET /workspaces/:workspaceId/audit-logs
// Query params: userId, action, targetType, targetId, fromDate, toDate, limit, offset
// RBAC: Admin only
// Response: { total, limit, offset, logs: AuditLog[] }
```

### AuditLogPresenter

**File:** `interfaces/presenters/AuditLogPresenter.ts`

```typescript
// Formats AuditLog domain entity to HTTP response shape:
// { id, workspaceId, userId, action, targetType, targetId, createdAt }
```

---

## Route

**File:** `infrastructure/routes/auditLog.routes.ts`

```
GET /workspaces/:workspaceId/audit-logs   → requireAdmin
```

---

## Integration: How to Add Audit Logging to Existing Use Cases

This is the most important step. Once the service is built, we inject it into **existing use cases** so they log their actions.

### Pattern (Example: CreateWorkItem use case)

```typescript
// BEFORE (current)
export class CreateWorkItem {
  constructor(
    private workItemRepo: IWorkItemRepository,
    private workItemTypeRepo: IWorkItemTypeRepository,
    private entityRepo: any
  ) {}
}

// AFTER (with audit logging)
export class CreateWorkItem {
  constructor(
    private workItemRepo: IWorkItemRepository,
    private workItemTypeRepo: IWorkItemTypeRepository,
    private entityRepo: any,
    private auditLogService?: IAuditLogService  // Optional — backward compatible
  ) {}

  async execute(dto: CreateWorkItemDTO): Promise<WorkItem> {
    // ...existing logic...
    const item = await this.workItemRepo.create(itemData);

    // Fire-and-forget audit log (after successful save)
    await this.auditLogService?.log({
      workspaceId: dto.workspaceId,
      userId:      dto.assignedToUserId,  // who triggered the action
      action:      AuditAction.WORK_ITEM_CREATED,
      targetType:  'WorkItem',
      targetId:    item.id,
    });

    return item;
  }
}
```

### Files to Modify (Existing Use Cases)

| Module | Use Cases to Update |
|--------|---------------------|
| **Entity** | `CreateEntity`, `UpdateEntity`, `DeleteEntity` |
| **Document Type** | `CreateDocumentType`, `UpdateDocumentType`, `DeleteDocumentType`, `AddField` |
| **Document** | `UploadDocument`, `UpdateDocument`, `DeleteDocument` |
| **Work Item** | `CreateWorkItem`, `UpdateWorkItem`, `UpdateWorkItemStatus`, `DeleteWorkItem`, `LinkDocument`, `UnlinkDocument`, `CreateWorkItemType`, `DeleteWorkItemType` |
| **Workspace** | `InviteUserToWorkspace`, `RemoveUserFromWorkspace`, `UpdateWorkspaceMember` |

> **Note:** Use `auditLogService?` (optional) so existing unit tests don't break.

### DI Wiring in Routes

The `AuditLogServiceImpl` is created once per route file and injected into use cases:

```typescript
// In each route file (e.g., workItem.routes.ts) — add at top:
import { AuditLogRepositoryImpl } from '../../../audit-log/infrastructure/mongoose/AuditLogRepositoryImpl';
import { RecordAudit } from '../../../audit-log/application/use-cases/RecordAudit';
import { AuditLogServiceImpl } from '../../../audit-log/infrastructure/mongoose/AuditLogServiceImpl';

const auditLogRepo  = new AuditLogRepositoryImpl();
const recordAuditUC = new RecordAudit(auditLogRepo);
const auditLogService = new AuditLogServiceImpl(recordAuditUC);

// Then pass to use cases:
const createWorkItemUC = new CreateWorkItem(workItemRepo, workItemTypeRepo, entityRepo, auditLogService);
```

---

## Data Flow (End-to-End)

```
1. HTTP Request
   POST /workspaces/:workspaceId/work-items
   Authorization: Bearer <token>

2. authMiddleware → extracts req.user.id
   rbacMiddleware → checks MEMBER or above

3. WorkItemController.createWorkItem()
   → calls CreateWorkItem.execute(dto)

4. CreateWorkItem use case (existing logic)
   → validates workItemType, entity
   → creates WorkItem via IWorkItemRepository
   → calls auditLogService?.log({           ← NEW
       workspaceId, userId, action,
       targetType: 'WorkItem', targetId
     })

5. AuditLogServiceImpl.log()           ← silent wrapper
   → calls RecordAudit.execute(dto)

6. RecordAudit use case
   → calls IAuditLogRepository.create()

7. AuditLogRepositoryImpl.create()
   → saves to MongoDB AuditLog collection

8. Response returned to client
   (audit failure never blocks this)
```

```
9. Admin queries audit logs:
   GET /workspaces/:workspaceId/audit-logs?action=WORK_ITEM_CREATED&userId=...

10. rbacMiddleware → requireAdmin

11. AuditLogController
    → parses query params into AuditLogFiltersDTO
    → calls GetAuditLogs.execute(workspaceId, filters)

12. GetAuditLogs use case
    → IAuditLogRepository.findByWorkspace()  (with filter + pagination)
    → IAuditLogRepository.countByWorkspace() (for total)

13. AuditLogPresenter formats response
    → { total, limit, offset, logs: [...] }
```

---

## Detailed Task List

### Phase 1: Domain Layer (Day 1 - Morning)
- [ ] Create `src/modules/audit-log/domain/enums/AuditAction.ts`
- [ ] Create `src/modules/audit-log/domain/entities/AuditLog.ts`
- [ ] Create `src/modules/audit-log/domain/repositories/IAuditLogRepository.ts`

### Phase 2: Application Layer (Day 1 - Afternoon)
- [ ] Create `src/modules/audit-log/application/services/IAuditLogService.ts`
- [ ] Create `src/modules/audit-log/application/dto/AuditLogDTO.ts`
- [ ] Create `src/modules/audit-log/application/use-cases/RecordAudit.ts`
- [ ] Create `src/modules/audit-log/application/use-cases/GetAuditLogs.ts`

### Phase 3: Infrastructure Layer (Day 1 - Afternoon)
- [ ] Create `src/modules/audit-log/infrastructure/mongoose/AuditLogModel.ts`
- [ ] Create `src/modules/audit-log/infrastructure/mongoose/AuditLogRepositoryImpl.ts`
- [ ] Create `src/modules/audit-log/infrastructure/mongoose/AuditLogServiceImpl.ts`

### Phase 4: Interfaces Layer (Day 2 - Morning)
- [ ] Create `src/modules/audit-log/interfaces/http/AuditLogController.ts`
- [ ] Create `src/modules/audit-log/interfaces/presenters/AuditLogPresenter.ts`
- [ ] Create `src/modules/audit-log/infrastructure/routes/auditLog.routes.ts`
- [ ] Register route in `src/app.ts`

### Phase 5: Integration (Day 2 - Afternoon) — Inject into existing use cases
- [ ] Update `CreateEntity`, `UpdateEntity`, `DeleteEntity`
- [ ] Update `CreateDocumentType`, `UpdateDocumentType`, `DeleteDocumentType`, `AddField`
- [ ] Update `UploadDocument`, `UpdateDocument`, `DeleteDocument`
- [ ] Update all Work Item use cases (8 use cases)
- [ ] Update 3 Workspace use cases
- [ ] Update each route file to wire `auditLogService`

### Phase 6: Testing (Day 3)
- [ ] Create `test-audit-log.sh` automated test script
- [ ] Create `test-audit-log.http` HTTP test file
- [ ] Test: Write operations create logs
- [ ] Test: GET audit logs with filters (`userId`, `action`, `targetType`, date range)
- [ ] Test: RBAC — Member cannot see audit logs, Admin can
- [ ] Test: Pagination (`limit` + `offset`)
- [ ] Test: Audit log failure does NOT break main operation

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/workspaces/:workspaceId/audit-logs` | Admin | List audit logs with filters |

### Query Parameters for GET

| Param | Type | SQL column | Description |
|-------|------|------------|-------------|
| `userId` | string | `user_id` | Filter by who performed the action |
| `action` | string | `action` | Filter by action type (e.g. `WORK_ITEM_CREATED`) |
| `targetType` | string | `target_type` | Filter by entity type (e.g. `WorkItem`) |
| `targetId` | string | `target_id` | Filter by specific target record ID |
| `fromDate` | ISO string | `created_at >=` | Start of date range |
| `toDate` | ISO string | `created_at <=` | End of date range |
| `limit` | number | — | Results per page (default: 50, max: 200) |
| `offset` | number | — | Pagination offset (default: 0) |

### Sample Response

```json
{
  "total": 142,
  "limit": 50,
  "offset": 0,
  "logs": [
    {
      "id": "64a1f9e2...",
      "workspaceId": "64a1f8c1...",
      "userId": "64a1f7b0...",
      "action": "WORK_ITEM_STATUS_CHANGED",
      "targetType": "WorkItem",
      "targetId": "64a1fa10...",
      "createdAt": "2026-02-19T09:15:00Z"
    }
  ]
}
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Optional `auditLogService` parameter** | Backward compatible — existing tests don't need to change |
| **Silent failure in `AuditLogServiceImpl.log()`** | Audit logging must never block user-facing operations |
| **No `metadata` field** | Matches SQL schema exactly — `audit_logs` table has no metadata column |
| **`createdAt` only (no `updatedAt`)** | Audit logs are append-only and immutable — consistent with SQL `created_at` |
| **MongoDB compound indexes on `workspaceId + createdAt`** | Covers the primary access pattern (recent logs per workspace) efficiently |
| **Single endpoint (GET only)** | Audit logs are written only via use case injection — no POST endpoint needed |
| **Admin-only read access** | Audit logs contain sensitive actor/action info |

---

## After Audit Log: Overview Module

Once Audit Log is complete, implement the Overview module:

- **HLR0028:** `GET /workspaces/:workspaceId/overview` → total counts for entities, documents, work items
- **HLR0029:** Breakdown by status (e.g., X DRAFT items, Y EXPIRING documents)
- Implementation: Single `GetWorkspaceOverview` use case using `Promise.all()` aggregations across all repositories
- No new domain entities needed
- Estimated: 1-2 days

---

**Plan Owner:** Development Team  
**Created:** February 19, 2026
