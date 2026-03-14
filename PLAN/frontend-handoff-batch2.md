# Frontend Handoff — Batch 2 Issue Fixes

Date: 2026-03-09
Backend changes: complete ✅ | TypeScript: 0 errors ✅

---

## Q1 — Audit Log Action Name Format (CONFIRMED)

**Format: `SCREAMING_SNAKE_CASE` strings — NOT camelCase dot-notation.**

Full enum (exact values stored in DB and returned in API):

```
USER_SIGNUP
USER_LOGIN
WORKSPACE_CREATED
WORKSPACE_MEMBER_INVITED
WORKSPACE_MEMBER_REMOVED
WORKSPACE_MEMBER_ROLE_UPDATED
ENTITY_CREATED
ENTITY_UPDATED
ENTITY_DELETED
DOCUMENT_TYPE_CREATED
DOCUMENT_TYPE_UPDATED
DOCUMENT_TYPE_DELETED
DOCUMENT_TYPE_FIELD_ADDED
DOCUMENT_UPLOADED
DOCUMENT_UPDATED
DOCUMENT_DELETED
WORK_ITEM_TYPE_CREATED
WORK_ITEM_TYPE_DELETED
WORK_ITEM_CREATED
WORK_ITEM_UPDATED
WORK_ITEM_STATUS_CHANGED
WORK_ITEM_DELETED
WORK_ITEM_DOCUMENT_LINKED
WORK_ITEM_DOCUMENT_UNLINKED
```

**Frontend action items:**
- Rebuild `ACTION_GROUPS` in `AuditLogFilters.tsx` using the values above
- Rebuild `getActionCategory()` in `AuditLogTable.tsx` to match
- `formatActionLabel` helper: split on `_`, title-case each word, e.g. `WORK_ITEM_STATUS_CHANGED` → `"Work Item Status Changed"`

---

## Q2 — User Info in Responses (NOW FIXED ON BACKEND)

Backend now returns `userEmail` and `userName` alongside every `userId` field.

### GET /workspaces/:id/members
```json
{
  "members": [
    {
      "id": "...",
      "workspaceId": "...",
      "userId": "uuid",
      "userEmail": "alice@company.com",
      "userName": "Alice Smith",
      "role": "ADMIN",
      "createdAt": "..."
    }
  ],
  "count": 3
}
```
- `userEmail` — always present (required field on User)
- `userName` — may be `null` if user has no display name set

**Frontend action items:**
- `src/components/features/workspace/MembersTable.tsx` — replace "User ID" column with `userEmail` (primary) + `userName` (secondary/subtitle)
- `src/components/features/audit-logs/AuditLogFilters.tsx` — populate member dropdown from this endpoint; use `userId` as the filter value, display `userEmail`

### GET /workspaces/:id/audit-logs
```json
{
  "total": 41,
  "limit": 50,
  "offset": 0,
  "logs": [
    {
      "id": "...",
      "workspaceId": "...",
      "userId": "uuid",
      "userEmail": "alice@company.com",
      "userName": "Alice Smith",
      "action": "ENTITY_CREATED",
      "targetType": "Entity",
      "targetId": "...",
      "createdAt": "..."
    }
  ]
}
```

**Frontend action items:**
- `src/components/features/audit-logs/AuditLogTable.tsx` line 59 — replace `{log.userId}` with `{log.userEmail ?? log.userId}`
- Update `AuditLog` TypeScript type to add `userEmail: string | null` and `userName: string | null`

### GET /workspaces/:id/work-items and GET /workspaces/:id/work-items/:id
```json
{
  "id": "...",
  "workspaceId": "...",
  "workItemTypeId": "...",
  "entityId": "...",
  "assignedToUserId": "uuid",
  "assignedToUserEmail": "bob@company.com",
  "assignedToUserName": "Bob Jones",
  "title": "Fix login bug",
  "status": "ACTIVE",
  "priority": "HIGH",
  "dueDate": null,
  "linkedDocumentIds": [],
  "linkedDocumentCount": 0,
  "createdAt": "...",
  "updatedAt": "..."
}
```

**Frontend action items:**
- Work item detail page — replace raw `assignedToUserId` display with `assignedToUserEmail`
- Update `WorkItem` TypeScript type to add `assignedToUserEmail: string | null` and `assignedToUserName: string | null`

---

## Q3 — Entity Documents Endpoint Response Shape (CONFIRMED)

`GET /workspaces/:id/entities/:entityId/documents` returns the **same shape as the main documents list** — NOT `linkedDocuments`:

```json
{
  "documents": [ ...Document[] ],
  "count": 7
}
```

**Frontend action item:**
- `src/lib/api/entities.ts` — `fetchEntityDocuments`: change `return res.data` to `return res.data.documents`
- Update return type from `Promise<LinkedDocumentsResponse>` to `Promise<Document[]>`
- No `{ success, data }` wrapper — direct `{ documents, count }` object

---

## Additional Backend Facts Confirmed (No Backend Change Needed)

### Entity response includes `parentId`
All entity create/update/get responses now include:
```json
{ "parentId": "uuid-or-null" }
```
This was added in a recent schema change but not yet shown in the UI. See PD-1 in the issue report.

### DocumentType response includes `entityType`
All document type responses now include:
```json
{ "entityType": "CUSTOMER" }  // or null
```
Values: `SELF | CUSTOMER | EMPLOYEE | VENDOR | null`. See PD-2 in the issue report.

---

## Full Frontend Fix Checklist (Batch 2)

| # | File | Fix | Blocked? |
|---|------|-----|----------|
| 1 | `src/lib/api/entities.ts` | `fetchEntityDocuments` → `res.data.documents` | ✅ Ready |
| 2 | `src/components/features/dashboard/AlertBanner.tsx` | Link to `/documents?expiryStatus=EXPIRING` | ✅ Ready |
| 3 | `src/app/(app)/[workspaceId]/documents/page.tsx` | Read `?expiryStatus` from URL as initial filter; add filter chip | ✅ Ready |
| 4 | `src/components/features/audit-logs/AuditLogTable.tsx` | Format action label; replace userId with userEmail | ✅ Ready |
| 5 | `src/components/features/audit-logs/AuditLogFilters.tsx` | Rebuild ACTION_GROUPS with correct values; member dropdown for userId filter | ✅ Ready |
| 6 | `src/app/(app)/[workspaceId]/audit-logs/page.tsx` | Fetch members and pass to AuditLogFilters | ✅ Ready |
| 7 | `src/components/features/entities/EntityTable.tsx` | Add "Belongs To" column (parentId → parent entity name) | ✅ Ready |
| 8 | `src/components/features/settings/document-types/DocumentTypeCard.tsx` | Show entityType badge | ✅ Ready |
| 9 | `src/components/features/work-items/CreateWorkItemDialog.tsx` | Searchable entity combobox (text input + filtered list) | ✅ Ready |
| 10 | `src/components/features/documents/UploadDocumentDialog.tsx` | Searchable entity combobox | ✅ Ready |
| 11 | Members table component | Replace "User ID" column with email/name from new `userEmail`/`userName` fields | ✅ Ready |
| 12 | Work item detail page | Replace `assignedToUserId` with `assignedToUserEmail` | ✅ Ready |
| 13 | TypeScript types | Add `userEmail`/`userName` to `AuditLog` type; `assignedToUserEmail`/`assignedToUserName` to `WorkItem` type; `userEmail`/`userName` to `WorkspaceMember` type | ✅ Ready |

---

## TypeScript Types to Update

```typescript
// Workspace member
interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  userEmail: string | null;   // NEW
  userName: string | null;    // NEW
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  createdAt: string;
}

// Audit log entry
interface AuditLog {
  id: string;
  workspaceId: string;
  userId: string;
  userEmail: string | null;   // NEW
  userName: string | null;    // NEW
  action: string;
  targetType: string;
  targetId: string | null;
  createdAt: string;
}

// Work item
interface WorkItem {
  // ... existing fields ...
  assignedToUserId: string | null;
  assignedToUserEmail: string | null;  // NEW
  assignedToUserName: string | null;   // NEW
  // ... rest ...
}
```
