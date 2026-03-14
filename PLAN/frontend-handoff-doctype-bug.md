# Frontend Handoff — Document Type Bug Investigation

Date: 2026-03-10
Backend changes: complete ✅ | TypeScript: 0 errors ✅

---

## TL;DR

The reported backend fixes were **already correctly implemented** in the current codebase. The "all document types vanish + dashboard breaks" symptoms cannot originate from the backend code as it stands. The root cause of the visual bug must be investigated in the frontend.

One real backend improvement was made (see below).

---

## Backend Verdict Per Reported Fix

### Fix 1 — Non-Atomic Document Type Creation
**Status: Already implemented ✅ (no code change needed)**

`DocumentTypeRepositoryImpl.create()` uses a MongoDB session with `startTransaction()` / `commitTransaction()` / `abortTransaction()`. Both the document type insert and the field inserts run inside the same session. If field insertion fails, the entire operation rolls back. Orphaned records are not possible from this code path.

### Fix 2 — Overview Crashes on Zero-Field Document Types
**Status: Already implemented ✅ (no code change needed)**

`GetWorkspaceOverview.ts` line 59: `fieldCount: fields?.length ?? 0`

`getFields()` always returns an array (empty if no fields). The `?.length ?? 0` guard handles both the empty array case and any theoretical null. The overview endpoint cannot crash due to a document type having zero fields.

### Fix 3 — GET /document-types Crashes or Returns `{ success: false }`
**Status: Already implemented ✅ (no code change needed)**

`findByWorkspaceId()` returns `DocumentType[]` without touching fields. `GetDocumentTypes.execute()` then calls `getFields()` per type in parallel — each returns `[]` at worst. The presenter receives `{ documentType, fields }[]` with the correct shape. There is no code path that produces `{ success: false, data: null }`.

### Fix 4 — Cleanup Orphaned Records (Migration)
**Status: Not needed ✅**

Since creation is transactional (Fix 1), orphaned records cannot exist from normal API usage. No cleanup migration is required.

---

## Backend Improvement Made

**Eliminated read-after-write in `CreateDocumentType.ts`**

Previously, after a successful transactional create, the use case made a second DB call (`findByIdWithFields`) to retrieve the result. If this post-commit read failed for any reason (e.g., transient network issue), it would throw a generic `Error` — meaning the frontend would receive a 500 despite the document type having been successfully created. This was a silent reliability gap.

**Fix:** `DocumentTypeRepositoryImpl.create()` now returns `{ documentType, fields }` directly from the transaction (the field documents from `insertMany` are already in memory). The separate `findByIdWithFields` call is eliminated entirely.

**Changed files:**
- `src/modules/document-type/domain/repositories/IDocumentTypeRepository.ts` — `create()` return type updated
- `src/modules/document-type/infrastructure/mongoose/DocumentTypeRepositoryImpl.ts` — returns `{ documentType, fields }` from transaction
- `src/modules/document-type/application/use-cases/CreateDocumentType.ts` — single-step create, no post-read

---

## Root Cause of "All Types Vanish" — Frontend Investigation Required

Since the backend cannot produce orphaned records or crash on an empty-fields edge case, the described symptoms point to a frontend-side issue. The following areas should be investigated:

### 1. Query invalidation on error
Check how `react-query` (or equivalent) handles `onError` in the create mutation. If the mutation hook invalidates the `document-types` query on **both success and error** (instead of only on success), a failed first attempt would trigger a refetch. If that refetch returns an unexpected shape at that moment, the list could incorrectly show as empty.

**What to check:**
```typescript
useMutation(createDocumentType, {
  onSuccess: () => queryClient.invalidateQueries(['document-types']),
  // onError should NOT invalidate the list query
})
```

### 2. Response shape assumptions
The GET list endpoint returns:
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "workspaceId": "...",
      "name": "Passport",
      "hasMetadata": true,
      "hasExpiry": true,
      "entityType": null,
      "fields": [
        { "id": "...", "fieldKey": "expiry_date", "fieldType": "date", "isRequired": true, "isExpiryField": true }
      ],
      "createdAt": "..."
    }
  ]
}
```

**No `count` field** is returned by the list endpoint. If frontend code accesses `response.data.count` or uses a count for rendering logic, it will be `undefined`. This likely doesn't cause "vanish" but worth auditing.

**The list shape IS `{ success, data: [...] }` — not `{ success, data: [...], count: N }`.** If the frontend type definition expects a `count` field and guards rendering on it (`if (count > 0) renderList()`), the list would appear empty even when data is present.

### 3. Error response format mismatch
When the backend returns a validation error (400), the response body is:
```json
{ "error": "Document type with metadata must have at least one field" }
```
or from the controller's field type check:
```json
{ "error": "Invalid field type 'X'. Must be one of: text, date" }
```

**These use the key `error`, not `message`.** If the frontend `onError` handler reads `error.response.data.message` and gets `undefined`, the user might not see a clear error toast, and might not realize the first attempt failed before "fixing" the form.

### 4. Suggested debugging steps
1. Open browser DevTools → Network tab
2. Reproduce the sequence: submit (fail) → fix → submit (succeed)
3. Check the response of the GET /document-types request that fires after the second submit
4. If that GET returns 200 with a non-empty array but the UI shows empty, the bug is in how the frontend reads/renders `res.data.data`
5. If the GET itself returns a non-200, check what triggered the error

---

## Confirmed API Contracts (No Changes)

### POST /workspaces/:id/document-types → 201
```json
{
  "success": true,
  "data": {
    "id": "...",
    "workspaceId": "...",
    "name": "Passport",
    "hasMetadata": true,
    "hasExpiry": true,
    "entityType": "CUSTOMER",
    "fields": [
      { "id": "...", "fieldKey": "passport_number", "fieldType": "text", "isRequired": true, "isExpiryField": false },
      { "id": "...", "fieldKey": "expiry_date", "fieldType": "date", "isRequired": true, "isExpiryField": true }
    ],
    "createdAt": "2026-03-10T..."
  }
}
```

### POST error responses
| Condition | Status | Body |
|-----------|--------|------|
| Invalid field type | 400 | `{ "error": "Invalid field type 'X'..." }` |
| hasMetadata=true, no fields | 400 | `{ "error": "Document type with metadata must have at least one field" }` |
| hasExpiry=true, no expiry field | 400 | `{ "error": "Document type with expiry tracking must have at least one expiry field" }` |
| Expiry field not `date` type | 400 | `{ "error": "Expiry fields must be of type date" }` |
| Duplicate field keys | 400 | `{ "error": "Duplicate field keys are not allowed" }` |

**Note:** All validation error bodies use key `"error"`, not `"message"`.

### GET /workspaces/:id/document-types → 200
```json
{
  "success": true,
  "data": [ ...same shape as single item above, repeated... ]
}
```
No `count` field. Array may be empty `[]` if no document types exist.

### GET /workspaces/:id/overview → 200 (document types section)
```json
{
  "documentTypes": [
    { "id": "...", "name": "Passport", "hasMetadata": true, "hasExpiry": true, "fieldCount": 2 }
  ]
}
```
`fieldCount` is always a number ≥ 0, never null.
