# WorkspaceOps API Documentation

**Base URL:** `http://localhost:4000`
**Interactive Docs (Swagger UI):** `http://localhost:4000/api-docs`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Roles & Permissions](#roles--permissions)
3. [Common Response Patterns](#common-response-patterns)
4. [Auth Endpoints](#1-auth)
5. [Workspace Endpoints](#2-workspaces)
6. [Entity Endpoints](#3-entities)
7. [Document Type Endpoints](#4-document-types)
8. [Document Endpoints](#5-documents)
9. [Work Item Type Endpoints](#6-work-item-types)
10. [Work Item Endpoints](#7-work-items)
11. [Audit Log Endpoints](#8-audit-logs)
12. [Overview Endpoint](#9-overview)
13. [Data Models Reference](#data-models-reference)
14. [Error Handling](#error-handling)
15. [Enums Reference](#enums-reference)

---

## Authentication

All endpoints except `/auth/signup` and `/auth/login` require a Bearer JWT token.

**How to include it:**
```
Authorization: Bearer <your-jwt-token>
```

You receive the token in the response body of `/auth/login` or `/auth/signup`.

---

## Roles & Permissions

| Role   | Who                                | Access Level                                   |
|--------|------------------------------------|------------------------------------------------|
| OWNER  | Workspace creator                  | Everything (same as ADMIN + ownership control) |
| ADMIN  | Elevated member                    | Manage members, types, delete resources        |
| MEMBER | Regular workspace member           | Create and read most resources                 |
| VIEWER | Read-only member (future use)      | Read only                                      |

Each endpoint description states the **minimum** role required.

**Role hierarchy:** OWNER > ADMIN > MEMBER > VIEWER

---

## Common Response Patterns

| Module         | Response Format                                  |
|----------------|--------------------------------------------------|
| Auth (signup)  | `{ success, data: { userId, workspaceId, token }, message }` |
| Auth (login)   | `{ success, data: { userId, token }, message }` |
| Workspace      | Direct object or array with `role` field         |
| Entity         | Direct object `{ id, workspaceId, name, role }` |
| Entity list    | `{ entities: [...], count }`                    |
| Document Type  | `{ success: true, data: {...} }` (create only)  |
| Document Type list | Direct array                               |
| Document       | Direct object with `expiryStatus`, `downloadUrl`|
| Document list  | `{ documents: [...], count }`                   |
| Work Item Type | Direct object                                   |
| Work Item      | Direct object                                   |
| Work Item list | Direct array                                    |
| Audit Log list | `{ total, limit, offset, logs: [...] }`        |
| Overview       | `{ workspaceId, entities, documents, workItems, documentTypes, workItemTypes }` |

---

## 1. Auth

### POST `/auth/signup`
Register a new user account.

**Auth required:** No

**What signup creates automatically:**
Signup does more than just create a user — it bootstraps your entire organisation:
1. **User** — your account
2. **Tenant** — an organisation container (holds your workspaces)
3. **Default Workspace** — a first workspace inside the tenant
4. **WorkspaceMember** — you are added as `OWNER` of the default workspace

The `workspaceId` in the response is the default workspace just created.
The `tenantId` is **not** returned directly — to obtain it, call `GET /workspaces` and read the `tenantId` field. You'll need it when creating additional workspaces.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "secret123",
  "name": "John Doe"
}
```

| Field    | Type   | Required | Notes              |
|----------|--------|----------|--------------------|
| email    | string | ✅       | Must be valid email |
| password | string | ✅       | Min 6 characters   |
| name     | string | ❌       | Display name        |

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "workspaceId": "64f1a2b3c4d5e6f7a8b9c0d2",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully"
}
```

> **`workspaceId`** — the default workspace auto-created for your account. Store this; you'll use it for all workspace-scoped API calls.

**Errors:** `400` validation error · `409` email already registered

---

### POST `/auth/login`
Login with email and password.

**Auth required:** No

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

> Login does **not** return `workspaceId`. To get your workspaces, call `GET /workspaces` after login.

**Errors:** `401` invalid credentials

---

## 2. Workspaces

### POST `/workspaces`
Create an additional workspace within an existing tenant. The caller automatically becomes the **OWNER**.

**Minimum role:** Authenticated (any)

**Where does `tenantId` come from?**
Your `tenantId` was auto-created when you signed up (as part of the Tenant→Workspace chain).
It is **not** in the signup response — call `GET /workspaces` and copy the `tenantId` field from any workspace. All your workspaces share the same `tenantId`.

**Request Body:**
```json
{
  "tenantId": "64f1a2b3c4d5e6f7a8b9c0d0",
  "name": "Acme HQ"
}
```

| Field    | Type   | Required | Notes |
|----------|--------|----------|-------|
| tenantId | string | ✅       | From `GET /workspaces` → `tenantId` |
| name     | string | ✅       | Human-readable workspace name |

**Response `201`:**
```json
{
  "id": "ws_xyz",
  "tenantId": "tenant_abc123",
  "name": "Acme HQ",
  "role": "OWNER",
  "createdAt": "2026-02-20T10:00:00.000Z"
}
```

---

### GET `/workspaces`
Get all workspaces the current user belongs to.

**Minimum role:** Authenticated (any)

**Response `200`:**
```json
[
  {
    "id": "ws_xyz",
    "tenantId": "tenant_abc123",
    "name": "Acme HQ",
    "role": "OWNER",
    "createdAt": "2026-02-20T10:00:00.000Z"
  }
]
```

---

### GET `/workspaces/:id/members`
List all current members of the workspace.

**Minimum role:** ADMIN

**Response `200`:**
```json
{
  "members": [
    { "id": "mem_abc", "workspaceId": "ws_xyz", "userId": "64f1a2b3...", "role": "OWNER", "createdAt": "..." },
    { "id": "mem_def", "workspaceId": "ws_xyz", "userId": "64f1a2b3...", "role": "MEMBER", "createdAt": "..." }
  ],
  "count": 2
}
```

---

### POST `/workspaces/:id/members`
Invite an existing user to the workspace by their email address.

**Minimum role:** ADMIN

**Request Body:**
```json
{
  "invitedEmail": "bob@example.com",
  "role": "MEMBER"
}
```

| Field         | Type   | Required | Notes                                          |
|---------------|--------|----------|------------------------------------------------|
| invitedEmail  | string | ✅       | The invitee's registered email address         |
| role          | string | ✅       | `OWNER`, `ADMIN`, `MEMBER`, or `VIEWER`       |

**How it works internally:** The API resolves the email to a userId and stores the userId in the membership record. The response returns the `userId`, not the email.

**Response `201`:**
```json
{
  "id": "member_record_id",
  "workspaceId": "ws_xyz",
  "userId": "64f1a2b3c4d5e6f7a8b9c0d2",
  "role": "MEMBER",
  "createdAt": "2026-02-20T10:00:00.000Z"
}
```

**Edge cases & errors:**
| Status | Scenario |
|--------|----------|
| `404`  | No account exists with that email — user must sign up first |
| `409`  | That user is already a member of this workspace |
| `403`  | Caller does not have ADMIN or OWNER role |
| `400`  | Invalid role value |

---

### PUT `/workspaces/:id/members/:memberId`
Update a member's role.

**Minimum role:** ADMIN

**Request Body:**
```json
{ "role": "ADMIN" }
```

**Response `200`:** Updated `WorkspaceMember` object

---

### DELETE `/workspaces/:id/members/:memberId`
Remove a member from the workspace.

**Minimum role:** ADMIN

**Response `200`:**
```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

---

## 3. Entities

Entities represent people or organizations tracked in a workspace (customers, employees, vendors, etc.)

### POST `/workspaces/:workspaceId/entities`
Create a new entity.

**Minimum role:** MEMBER

**Request Body:**
```json
{
  "name": "Acme Corp",
  "role": "CUSTOMER"
}
```

| Field | Type       | Required | Values                              |
|-------|------------|----------|-------------------------------------|
| name  | string     | ✅       | Max 255 chars                       |
| role  | EntityRole | ✅       | `SELF`, `CUSTOMER`, `EMPLOYEE`, `VENDOR` |

**Response `201`:**
```json
{
  "id": "ent_abc",
  "workspaceId": "ws_xyz",
  "name": "Acme Corp",
  "role": "CUSTOMER",
  "createdAt": "2026-02-20T10:00:00.000Z"
}
```

---

### GET `/workspaces/:workspaceId/entities`
Get all entities in the workspace.

**Minimum role:** MEMBER

**Query Parameters:**

| Param  | Type   | Notes                                                      |
|--------|--------|------------------------------------------------------------|
| `role` | string | Filter by role: `CUSTOMER`, `EMPLOYEE`, `VENDOR`, `SELF`  |

**Response `200`:**
```json
{
  "entities": [
    { "id": "ent_abc", "workspaceId": "ws_xyz", "name": "Acme Corp", "role": "CUSTOMER", "createdAt": "..." }
  ],
  "count": 1
}
```

---

### GET `/workspaces/:workspaceId/entities/:id`
Get a single entity by ID.

**Minimum role:** MEMBER

**Response `200`:** Entity object `{ id, workspaceId, name, role, createdAt }`

**Errors:** `404` if entity not found or belongs to a different workspace.

---

### PUT `/workspaces/:workspaceId/entities/:id`
Update an entity. All fields optional.

**Minimum role:** MEMBER

**Request Body:**
```json
{
  "name": "Acme Corporation",
  "role": "VENDOR"
}
```

**Response `200`:** Updated entity object

---

### DELETE `/workspaces/:workspaceId/entities/:id`
Delete an entity.

**Minimum role:** ADMIN

**Response `204`:** No content

---

## 4. Document Types

Document types define the schema/template for documents (e.g., "Passport", "Invoice", "Contract").

### POST `/workspaces/:workspaceId/document-types`
Create a document type.

**Minimum role:** ADMIN

**Business Rules:**
- If `hasMetadata: true` → must provide at least one item in `fields[]`
- If `hasExpiry: true` → at least one field must have `isExpiryField: true` and `fieldType: "date"`
- Field types must be **lowercase**: `"text"` or `"date"` (not `"TEXT"`)

**Request Body:**
```json
{
  "name": "Passport",
  "hasMetadata": true,
  "hasExpiry": true,
  "fields": [
    {
      "fieldKey": "passport_number",
      "fieldType": "text",
      "isRequired": true,
      "isExpiryField": false
    },
    {
      "fieldKey": "expiry_date",
      "fieldType": "date",
      "isRequired": true,
      "isExpiryField": true
    }
  ]
}
```

| Field       | Type    | Required | Notes                                |
|-------------|---------|----------|--------------------------------------|
| name        | string  | ✅       | Max 255 chars                        |
| hasMetadata | boolean | ❌       | Default `false`                      |
| hasExpiry   | boolean | ❌       | Default `false`                      |
| fields      | array   | Conditional | Required if `hasMetadata` or `hasExpiry` is true |

**Field object:**

| Field        | Type      | Required | Notes                                    |
|--------------|-----------|----------|------------------------------------------|
| fieldKey     | string    | ✅       | Alphanumeric + underscore, max 100 chars |
| fieldType    | FieldType | ✅       | `"text"` or `"date"` (lowercase)        |
| isRequired   | boolean   | ❌       | Default `false`                          |
| isExpiryField| boolean   | ❌       | Default `false`. Must be `"date"` type if `true` |

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "dt_abc",
    "workspaceId": "ws_xyz",
    "name": "Passport",
    "hasMetadata": true,
    "hasExpiry": true,
    "fields": [
      { "id": "field_1", "documentTypeId": "dt_abc", "fieldKey": "passport_number", "fieldType": "text", "isRequired": true, "isExpiryField": false },
      { "id": "field_2", "documentTypeId": "dt_abc", "fieldKey": "expiry_date", "fieldType": "date", "isRequired": true, "isExpiryField": true }
    ],
    "createdAt": "2026-02-20T10:00:00.000Z"
  }
}
```

> **Note:** The create response is wrapped in `{ success, data }`. All other document type responses return the object/array directly.

---

### GET `/workspaces/:workspaceId/document-types`
Get all document types (with their fields).

**Minimum role:** MEMBER

**Response `200`:** Direct array of document type objects (no `success` wrapper)

---

### GET `/workspaces/:workspaceId/document-types/:id`
Get a single document type by ID.

**Minimum role:** MEMBER

**Response `200`:** Document type object with `fields` array

---

### PUT `/workspaces/:workspaceId/document-types/:id`
Update document type name or flags. Does **not** manage fields — use the `/fields` endpoint for that.

**Minimum role:** ADMIN

**Request Body (all optional):**
```json
{
  "name": "National Passport",
  "hasMetadata": true,
  "hasExpiry": true
}
```

**Response `200`:** Updated document type with existing fields

---

### POST `/workspaces/:workspaceId/document-types/:id/fields`
Add a new field to an existing document type.

**Minimum role:** ADMIN

**Request Body:**
```json
{
  "fieldKey": "issue_country",
  "fieldType": "text",
  "isRequired": false,
  "isExpiryField": false
}
```

**Response `201`:** The newly created field object

---

### DELETE `/workspaces/:workspaceId/document-types/:id`
Delete a document type.

**Minimum role:** ADMIN

**Response `204`:** No content

---

## 5. Documents

### POST `/workspaces/:workspaceId/documents`
Upload a document.

**Minimum role:** MEMBER
**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field          | Type   | Required | Notes                                                  |
|----------------|--------|----------|--------------------------------------------------------|
| `file`         | binary | ✅       | The actual file (PDF, image, etc.)                     |
| `documentTypeId` | string | ✅   | Must match an existing document type in this workspace |
| `entityId`     | string | ❌       | Associate with an entity                               |
| `metadata`     | string | ❌       | JSON **string** of key-value pairs matching the document type's fields |
| `expiryDate`   | string | ❌       | Format: `YYYY-MM-DD`                                   |

**Example using `curl`:**
```bash
curl -X POST http://localhost:4000/workspaces/ws_xyz/documents \
  -H "Authorization: Bearer <token>" \
  -F "file=@passport.pdf" \
  -F "documentTypeId=dt_abc" \
  -F "entityId=ent_123" \
  -F 'metadata={"passport_number":"AB1234567","expiry_date":"2029-06-30"}' \
  -F "expiryDate=2029-06-30"
```

**Response `201`:**
```json
{
  "id": "doc_xyz",
  "workspaceId": "ws_xyz",
  "documentTypeId": "dt_abc",
  "entityId": "ent_123",
  "fileName": "passport.pdf",
  "fileUrl": "/uploads/ws_xyz/passport.pdf",
  "downloadUrl": "/workspaces/ws_xyz/documents/doc_xyz/download",
  "mimeType": "application/pdf",
  "fileSize": 204800,
  "metadata": {
    "passport_number": "AB1234567",
    "expiry_date": "2029-06-30"
  },
  "expiryDate": "2029-06-30",
  "expiryStatus": "VALID",
  "uploadedBy": "user_id",
  "createdAt": "2026-02-20T10:00:00.000Z"
}
```

---

### GET `/workspaces/:workspaceId/documents`
Get all documents in a workspace.

**Minimum role:** MEMBER

**Query Parameters:**

| Param            | Type   | Notes                                                                           |
|------------------|--------|---------------------------------------------------------------------------------|
| `documentTypeId` | string | Filter by document type                                                         |
| `entityId`       | string | Filter by entity                                                                |
| `expiryStatus`   | string | Filter by computed expiry status: `VALID`, `EXPIRING`, `EXPIRED`               |

> **Note:** `expiryStatus` filtering is done in-memory after DB fetch (expiry status is computed, not stored).

**Response `200`:**
```json
{
  "documents": [ ...document objects... ],
  "count": 42
}
```

---

### GET `/workspaces/:workspaceId/documents/expiring`
Get documents that are expiring soon or already expired.

> **Important:** This route must be called before `/documents/:id` — make sure your API client/router handles this correctly (the server already does).

**Minimum role:** MEMBER

**Query Parameters:**

| Param | Type    | Default | Notes                                  |
|-------|---------|---------|----------------------------------------|
| `days` | integer | 30     | Documents expiring within N days returned |

**Response `200`:** Array of document objects (with `expiryStatus` of `EXPIRING` or `EXPIRED`)

---

### GET `/workspaces/:workspaceId/documents/:id`
Get a single document by ID.

**Minimum role:** MEMBER

**Response `200`:** Document object with computed `expiryStatus` and `downloadUrl`

---

### GET `/workspaces/:workspaceId/documents/:id/download`
Download the actual file.

**Minimum role:** MEMBER

**Response `200`:** Binary file stream with `Content-Disposition: attachment` header.

```html
<!-- Frontend usage -->
<a href="http://localhost:4000/workspaces/ws_xyz/documents/doc_abc/download"
   download>
  Download File
</a>
```

> You need to pass the Authorization header — a plain `<a>` tag won't do this automatically. Use `fetch` + `Blob` or an authenticated link approach.

---

### GET `/workspaces/:workspaceId/entities/:entityId/documents`
Get all documents belonging to a specific entity.

**Minimum role:** MEMBER

**Response `200`:** Array of document objects

---

### PUT `/workspaces/:workspaceId/documents/:id`
Update document metadata, entity, or expiry date. Cannot replace the file.

**Minimum role:** MEMBER

**Request Body (all optional):**
```json
{
  "entityId": "ent_new",
  "expiryDate": "2030-01-01",
  "metadata": {
    "passport_number": "CD9876543"
  }
}
```

**Response `200`:** Updated document object

---

### DELETE `/workspaces/:workspaceId/documents/:id`
Delete a document and its file from storage.

**Minimum role:** ADMIN

**Response `204`:** No content

---

## 6. Work Item Types

Work item types are categories/templates for work items (e.g., "Employee Onboarding", "KYC Review", "Contract Signing").

### POST `/workspaces/:workspaceId/work-item-types`
Create a work item type.

**Minimum role:** ADMIN

**Request Body:**
```json
{
  "name": "Employee Onboarding",
  "description": "Tasks for onboarding new employees",
  "entityType": "EMPLOYEE"
}
```

| Field       | Type   | Required | Notes                                      |
|-------------|--------|----------|--------------------------------------------|
| name        | string | ✅       | Max 255 chars                              |
| description | string | ❌       | Max 1000 chars                             |
| entityType  | string | ❌       | `SELF`, `CUSTOMER`, `EMPLOYEE`, or `VENDOR`. Restricts which entity roles this type applies to |

**Response `201`:**
```json
{
  "id": "wit_abc",
  "workspaceId": "ws_xyz",
  "name": "Employee Onboarding",
  "description": "Tasks for onboarding new employees",
  "entityType": "EMPLOYEE",
  "createdAt": "2026-02-20T10:00:00.000Z"
}
```

---

### GET `/workspaces/:workspaceId/work-item-types`
Get all work item types.

**Minimum role:** MEMBER

**Response `200`:** `{ workItemTypes: [...], count: N }` — use `data.workItemTypes` (not `data` as a direct array)

---

### DELETE `/workspaces/:workspaceId/work-item-types/:id`
Delete a work item type.

**Minimum role:** ADMIN

**Response `204`:** No content

---

## 7. Work Items

Work items are tasks or activities associated with an entity.

### POST `/workspaces/:workspaceId/work-items`
Create a work item.

**Minimum role:** MEMBER

**Notes:**
- New items always start in **DRAFT** status
- `assignedToUserId` is automatically set to the authenticated user

**Request Body:**
```json
{
  "workItemTypeId": "wit_abc",
  "entityId": "ent_123",
  "title": "Collect passport documents",
  "description": "Collect and verify passport copy and renewal form",
  "priority": "HIGH",
  "dueDate": "2026-03-15T00:00:00.000Z"
}
```

| Field          | Type     | Required | Notes                           |
|----------------|----------|----------|---------------------------------|
| workItemTypeId | string   | ✅       | Must exist in the workspace     |
| entityId       | string   | ✅       | Must exist in the workspace     |
| title          | string   | ✅       | Max 255 chars                   |
| description    | string   | ❌       | Max 2000 chars                  |
| priority       | Priority | ❌       | `LOW`, `MEDIUM`, or `HIGH`     |
| dueDate        | datetime | ❌       | ISO 8601 format                 |

**Response `201`:** Work item object with `status: "DRAFT"`

---

### GET `/workspaces/:workspaceId/work-items`
Get work items with optional filters.

**Minimum role:** MEMBER

**Query Parameters:**

| Param            | Type   | Notes                    |
|------------------|--------|--------------------------|
| `status`         | string | `DRAFT`, `ACTIVE`, `COMPLETED` |
| `workItemTypeId` | string | Filter by type           |
| `entityId`       | string | Filter by entity         |
| `assignedToUserId` | string | Filter by assignee     |
| `priority`       | string | `LOW`, `MEDIUM`, `HIGH` |

**Response `200`:** `{ workItems: [...], count: N }` — use `data.workItems` (not `data` as a direct array)

---

### GET `/workspaces/:workspaceId/work-items/:id`
Get a single work item by ID.

**Minimum role:** MEMBER

**Response `200`:** Work item object + `linkedDocumentIds` array
```json
{
  "id": "wi_abc",
  "workspaceId": "ws_xyz",
  "workItemTypeId": "wit_abc",
  "entityId": "ent_123",
  "assignedToUserId": "user_xyz",
  "title": "Collect passport documents",
  "status": "DRAFT",
  "priority": "HIGH",
  "dueDate": "2026-03-15T00:00:00.000Z",
  "linkedDocumentIds": ["doc_abc", "doc_def"],
  "createdAt": "2026-02-20T10:00:00.000Z",
  "updatedAt": "2026-02-20T10:00:00.000Z"
}
```

---

### PUT `/workspaces/:workspaceId/work-items/:id`
Update a work item's fields. Does **not** change status — use `PATCH /status` for that.

**Minimum role:** MEMBER

**Request Body (all optional):**
```json
{
  "title": "Collect all required documents",
  "description": "Updated instructions",
  "priority": "LOW",
  "dueDate": "2026-04-01T00:00:00.000Z",
  "entityId": "ent_456"
}
```

**Response `200`:** Updated work item object

---

### PATCH `/workspaces/:workspaceId/work-items/:id/status`
Transition a work item's status.

**Minimum role:** MEMBER

**Status Machine:**

```
DRAFT ──→ ACTIVE ──→ COMPLETED
  ↑          ↑──────────↓
  └──────────┘
```

| Transition              | Allowed |
|-------------------------|---------|
| DRAFT → ACTIVE          | ✅      |
| ACTIVE → COMPLETED      | ✅      |
| COMPLETED → ACTIVE      | ✅ (reopen) |
| ACTIVE → DRAFT          | ✅ (unstart) |
| DRAFT → COMPLETED       | ❌      |
| COMPLETED → DRAFT       | ❌      |

**Request Body:**
```json
{ "status": "ACTIVE" }
```

**Response `200`:** Work item with updated status

**Errors:** `400` if the transition is not allowed

---

### POST `/workspaces/:workspaceId/work-items/:id/documents`
Link an existing document to a work item.

**Minimum role:** MEMBER

**Request Body:**
```json
{ "documentId": "doc_abc789" }
```

**Response `200`:**
```json
{
  "id": "link_id",
  "workItemId": "wi_abc",
  "documentId": "doc_abc789",
  "linkedAt": "2026-02-20T10:00:00.000Z"
}
```

---

### GET `/workspaces/:workspaceId/work-items/:id/documents`
Get all documents linked to a work item. Returns full document objects (not just link metadata).

**Minimum role:** MEMBER

**Response `200`:**
```json
{
  "linkedDocuments": [
    {
      "id": "doc_abc",
      "workspaceId": "ws_123",
      "documentTypeId": "dt_xyz",
      "entityId": "ent_456",
      "fileName": "passport.pdf",
      "fileSize": 204800,
      "mimeType": "application/pdf",
      "expiryDate": "2029-06-30",
      "expiryStatus": "VALID",
      "metadata": null,
      "uploadedBy": "user_789",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "linkedAt": "2026-02-01T00:00:00.000Z",
      "downloadUrl": "http://localhost:4000/workspaces/ws_123/documents/doc_abc/download"
    }
  ],
  "count": 1
}
```

> Note: `documentTypeId` is an ID. To display a human-readable document type name, join client-side using data from `GET /document-types`.

---

### DELETE `/workspaces/:workspaceId/work-items/:id/documents/:docId`
Unlink a document from a work item. Does **not** delete the document itself.

**Minimum role:** MEMBER

**Response `204`:** No content

---

### DELETE `/workspaces/:workspaceId/work-items/:id`
Delete a work item.

**Minimum role:** ADMIN

**Response `204`:** No content

---

### GET `/workspaces/:workspaceId/entities/:entityId/work-items`
Get all work items for a specific entity.

**Minimum role:** MEMBER

**Response `200`:** `{ workItems: [...], count: N }` — use `data.workItems` (not `data` as a direct array)

---

## 8. Audit Logs

Audit logs are automatically created for every state-changing action in the system. You cannot create them manually.

### GET `/workspaces/:workspaceId/audit-logs`
Get the audit trail with filtering and pagination.

**Minimum role:** ADMIN

**Query Parameters:**

| Param        | Type     | Notes                                                  |
|--------------|----------|--------------------------------------------------------|
| `userId`     | string   | Filter by actor (who did the action)                  |
| `action`     | string   | Filter by action type (see [AuditAction enum](#auditaction)) |
| `targetType` | string   | Resource type, e.g., `"WorkItem"`, `"Entity"`, `"Document"` |
| `targetId`   | string   | Specific resource ID                                   |
| `fromDate`   | datetime | ISO 8601 start date                                    |
| `toDate`     | datetime | ISO 8601 end date                                      |
| `limit`      | integer  | Max per page (default 50, max 200)                    |
| `offset`     | integer  | Records to skip (default 0)                           |

**Response `200`:**
```json
{
  "total": 342,
  "limit": 50,
  "offset": 0,
  "logs": [
    {
      "id": "6790abc123def456",
      "workspaceId": "ws_xyz",
      "userId": "user_abc",
      "action": "WORK_ITEM_CREATED",
      "targetType": "WorkItem",
      "targetId": "wi_789",
      "createdAt": "2026-02-20T10:30:00.000Z"
    }
  ]
}
```

> **Note:** No `success` wrapper — just the object directly.

---

## 9. Overview

### GET `/workspaces/:workspaceId/overview`
Get aggregated workspace summary for dashboard display.

**Minimum role:** MEMBER

**Response `200`:**
```json
{
  "workspaceId": "ws_abc123",
  "entities": {
    "total": 42,
    "byRole": {
      "SELF": 1,
      "CUSTOMER": 25,
      "EMPLOYEE": 15,
      "VENDOR": 1
    }
  },
  "documents": {
    "total": 156,
    "byStatus": {
      "VALID": 140,
      "EXPIRING": 10,
      "EXPIRED": 6
    }
  },
  "workItems": {
    "total": 78,
    "byStatus": {
      "DRAFT": 20,
      "ACTIVE": 40,
      "COMPLETED": 18
    }
  },
  "documentTypes": [
    {
      "id": "dt_abc",
      "name": "Passport",
      "hasMetadata": true,
      "hasExpiry": true,
      "fieldCount": 2
    }
  ],
  "workItemTypes": [
    {
      "id": "wit_xyz",
      "name": "Employee Onboarding",
      "entityType": "EMPLOYEE"
    }
  ]
}
```

---

## Data Models Reference

### User
| Field     | Type     | Notes            |
|-----------|----------|------------------|
| id        | string   | MongoDB ObjectId |
| email     | string   | Unique           |
| name      | string?  | Optional         |
| createdAt | datetime |                  |
| updatedAt | datetime |                  |

### Workspace
| Field     | Type     | Notes            |
|-----------|----------|------------------|
| id        | string   |                  |
| tenantId  | string   |                  |
| name      | string   |                  |
| createdAt | datetime |                  |

### WorkspaceMember
| Field       | Type          | Notes                    |
|-------------|---------------|--------------------------|
| id          | string        |                          |
| workspaceId | string        |                          |
| userId      | string        |                          |
| role        | WorkspaceRole | OWNER/ADMIN/MEMBER/VIEWER|
| createdAt   | datetime      |                          |

### Entity
| Field       | Type       | Notes                               |
|-------------|------------|-------------------------------------|
| id          | string     |                                     |
| workspaceId | string     |                                     |
| name        | string     | Max 255 chars                       |
| role        | EntityRole | SELF/CUSTOMER/EMPLOYEE/VENDOR       |
| createdAt   | datetime   |                                     |

### DocumentType
| Field       | Type     | Notes                                    |
|-------------|----------|------------------------------------------|
| id          | string   |                                          |
| workspaceId | string   |                                          |
| name        | string   | Max 255 chars                            |
| hasMetadata | boolean  |                                          |
| hasExpiry   | boolean  |                                          |
| fields      | Field[]  | Nested array of DocumentTypeField        |
| createdAt   | datetime |                                          |

### DocumentTypeField
| Field          | Type      | Notes                                      |
|----------------|-----------|--------------------------------------------|
| id             | string    |                                            |
| documentTypeId | string    |                                            |
| fieldKey       | string    | Alphanumeric + underscore, max 100 chars   |
| fieldType      | FieldType | `"text"` or `"date"` (lowercase!)          |
| isRequired     | boolean   |                                            |
| isExpiryField  | boolean   | Only valid when `fieldType` is `"date"`    |

### Document
| Field          | Type           | Notes                                     |
|----------------|----------------|-------------------------------------------|
| id             | string         |                                           |
| workspaceId    | string         |                                           |
| documentTypeId | string         |                                           |
| entityId       | string?        | Optional                                  |
| fileName       | string         |                                           |
| fileUrl        | string         | Internal server path                      |
| downloadUrl    | string         | Use this to build download links          |
| mimeType       | string?        |                                           |
| fileSize       | number         | Bytes                                     |
| metadata       | object?        | Key-value pairs                           |
| expiryDate     | date?          | YYYY-MM-DD                                |
| expiryStatus   | DocumentStatus | `VALID`, `EXPIRING`, or `EXPIRED`        |
| uploadedBy     | string         | User ID                                   |
| createdAt      | datetime       |                                           |

### WorkItemType
| Field       | Type   | Notes                                      |
|-------------|--------|--------------------------------------------|
| id          | string |                                            |
| workspaceId | string |                                            |
| name        | string | Max 255 chars                              |
| description | string?| Max 1000 chars                             |
| entityType  | string?| Optional entity role restriction           |
| createdAt   | datetime |                                          |

### WorkItem
| Field            | Type             | Notes                       |
|------------------|------------------|-----------------------------|
| id               | string           |                             |
| workspaceId      | string           |                             |
| workItemTypeId   | string           |                             |
| entityId         | string           |                             |
| assignedToUserId | string           |                             |
| title            | string           | Max 255 chars               |
| description      | string?          | Max 2000 chars              |
| status           | WorkItemStatus   | DRAFT/ACTIVE/COMPLETED      |
| priority         | WorkItemPriority?| LOW/MEDIUM/HIGH             |
| dueDate          | datetime?        |                             |
| createdAt        | datetime         |                             |
| updatedAt        | datetime         |                             |

### AuditLog
| Field       | Type        | Notes                  |
|-------------|-------------|------------------------|
| id          | string      | MongoDB ObjectId        |
| workspaceId | string      |                        |
| userId      | string      | Who did the action     |
| action      | AuditAction | See enum below         |
| targetType  | string      | e.g., "WorkItem"       |
| targetId    | string?     | Affected resource ID   |
| createdAt   | datetime    |                        |

---

## Error Handling

All errors follow this shape:
```json
{
  "error": "Descriptive error message"
}
```

| Status | Meaning                                     |
|--------|---------------------------------------------|
| 400    | Validation error or bad request             |
| 401    | Missing or invalid JWT token                |
| 403    | Valid token but insufficient role           |
| 404    | Resource not found                          |
| 409    | Conflict (duplicate, already exists, etc.)  |
| 500    | Internal server error                       |

---

## Enums Reference

### WorkspaceRole
`OWNER` · `ADMIN` · `MEMBER` · `VIEWER`

### EntityRole
`SELF` · `CUSTOMER` · `EMPLOYEE` · `VENDOR`

### FieldType
`text` · `date` *(must be lowercase)*

### DocumentStatus
`VALID` · `EXPIRING` · `EXPIRED`

Calculation (relative to today):
- **EXPIRED** — expiry date is in the past
- **EXPIRING** — expiry date is within 30 days from now
- **VALID** — expiry date is more than 30 days away (or no expiry date)

### WorkItemStatus
`DRAFT` · `ACTIVE` · `COMPLETED`

### WorkItemPriority
`LOW` · `MEDIUM` · `HIGH`

### AuditAction
| Action                         | Triggered by                          |
|--------------------------------|---------------------------------------|
| `USER_SIGNUP`                  | POST /auth/signup                     |
| `USER_LOGIN`                   | POST /auth/login                      |
| `WORKSPACE_CREATED`            | POST /workspaces                      |
| `WORKSPACE_MEMBER_INVITED`     | POST /workspaces/:id/members          |
| `WORKSPACE_MEMBER_REMOVED`     | DELETE /workspaces/:id/members/:mid   |
| `WORKSPACE_MEMBER_ROLE_UPDATED`| PUT /workspaces/:id/members/:mid      |
| `ENTITY_CREATED`               | POST /entities                        |
| `ENTITY_UPDATED`               | PUT /entities/:id                     |
| `ENTITY_DELETED`               | DELETE /entities/:id                  |
| `DOCUMENT_TYPE_CREATED`        | POST /document-types                  |
| `DOCUMENT_TYPE_UPDATED`        | PUT /document-types/:id               |
| `DOCUMENT_TYPE_DELETED`        | DELETE /document-types/:id            |
| `DOCUMENT_TYPE_FIELD_ADDED`    | POST /document-types/:id/fields       |
| `DOCUMENT_UPLOADED`            | POST /documents                       |
| `DOCUMENT_UPDATED`             | PUT /documents/:id                    |
| `DOCUMENT_DELETED`             | DELETE /documents/:id                 |
| `WORK_ITEM_TYPE_CREATED`       | POST /work-item-types                 |
| `WORK_ITEM_TYPE_DELETED`       | DELETE /work-item-types/:id           |
| `WORK_ITEM_CREATED`            | POST /work-items                      |
| `WORK_ITEM_UPDATED`            | PUT /work-items/:id                   |
| `WORK_ITEM_STATUS_CHANGED`     | PATCH /work-items/:id/status          |
| `WORK_ITEM_DELETED`            | DELETE /work-items/:id                |
| `WORK_ITEM_DOCUMENT_LINKED`    | POST /work-items/:id/documents        |
| `WORK_ITEM_DOCUMENT_UNLINKED`  | DELETE /work-items/:id/documents/:did |
