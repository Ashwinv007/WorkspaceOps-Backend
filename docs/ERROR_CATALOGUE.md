# Error Code Catalogue — WorkspaceOps API

> **Document Type:** LLD — Error Reference
> **Related:** [API Documentation](../API_DOCUMENTATION.md) · [HLD](./HLD.md)

Every error this API can return, grouped by HTTP status code. All errors share a consistent shape:

```json
{
  "success": false,
  "error": {
    "message": "Human-readable description",
    "statusCode": 400
  }
}
```

---

## HTTP Status Codes Used

| Code | Class | Meaning |
|---|---|---|
| `200` | — | Success |
| `201` | — | Resource created |
| `400` | `ValidationError` | Bad request — invalid input, failed business rule |
| `401` | `UnauthorizedError` | Not authenticated — missing or invalid token |
| `403` | `ForbiddenError` | Authenticated but not authorised — wrong role or wrong workspace |
| `404` | `NotFoundError` | Resource does not exist |
| `409` | `ConflictError` | State conflict — duplicate resource or concurrent update race |
| `500` | — | Unexpected server error — never exposes internal details |

---

## 400 — Validation Errors

Client sent invalid data or violated a business rule.

### Authentication
| Message | Thrown By |
|---|---|
| `"Email is required"` | `User` domain entity |
| `"Invalid email format"` | `User` domain entity |
| `"Password hash is required"` | `User` domain entity |

### Workspace
| Message | Thrown By |
|---|---|
| `"Workspace name is required"` | `CreateWorkspace`, `Workspace` domain entity |
| `"Invalid workspace ID format"` | Multiple use cases |
| `"Invalid tenant ID format"` | `CreateWorkspace` |
| `"Invalid role"` | `InviteUserToWorkspace`, `UpdateWorkspaceMember`, `WorkspaceMember` domain |
| `"Cannot remove the last owner from the workspace"` | `RemoveUserFromWorkspace` |
| `"Cannot remove the last owner. Please assign another owner first."` | `UpdateWorkspaceMember` |

### Entity
| Message | Thrown By |
|---|---|
| `"Entity name is required"` | `CreateEntity`, `Entity` domain entity |
| `"Entity name cannot be empty"` | `UpdateEntity` |
| `"Entity name must not exceed 255 characters"` | `CreateEntity`, `UpdateEntity`, `Entity` domain |
| `"Invalid entity ID format"` | `DeleteEntity`, `UpdateEntity`, `GetEntityById` |
| `"Parent entity cannot be an EMPLOYEE."` | `CreateEntity`, `UpdateEntity` |
| `"No fields to update"` | `UpdateEntity` |
| `"Entity role must be one of: ..."` | `CreateEntity`, domain |

### Document Type
| Message | Thrown By |
|---|---|
| `"Document type name is required"` | `CreateDocumentType`, domain |
| `"Document type name cannot be empty"` | `UpdateDocumentType` |
| `"Document type name must not exceed 255 characters"` | `CreateDocumentType`, domain |
| `"Document type with metadata must have at least one field"` | `CreateDocumentType` |
| `"Document type with expiry tracking must have at least one expiry field"` | `CreateDocumentType` |
| `"Expiry fields must be of type date"` | `CreateDocumentType`, `AddField` |
| `"Duplicate field keys are not allowed"` | `CreateDocumentType` |
| `"Field with key '<key>' already exists"` | `AddField` |
| `"Field key is required"` | `DocumentTypeField` domain |
| `"Field key must not exceed 100 characters"` | `DocumentTypeField` domain |
| `"Field key must contain only alphanumeric characters and underscores"` | `DocumentTypeField` domain |
| `"Invalid document type ID format"` | Multiple use cases |
| `"Expiry field must be of type date"` | `AddField`, `DocumentTypeField` domain |
| `"Expiry field must be a date field"` | `DocumentTypeField` domain |
| `"Document type name must not exceed 255 characters"` | domain |

### Document
| Message | Thrown By |
|---|---|
| `"This document type requires metadata fields"` | `UploadDocument` |
| `"At least one field must be provided for update"` | `UpdateDocument` |
| `"Workspace ID is required"` | `Document` domain entity |
| `"Document Type ID is required"` | `Document` domain entity |
| `"File name is required"` | `Document` domain entity |
| `"File name must not exceed 255 characters"` | `Document` domain entity |
| `"File URL is required"` | `Document` domain entity |
| `"File size must be greater than 0"` | `Document` domain entity |
| `"Uploaded by user ID is required"` | `Document` domain entity |
| `"Only <types> files are allowed"` | `upload.middleware` (Multer) |
| `"File upload error: <message>"` | `upload.middleware` (Multer) |

### Work Item
| Message | Thrown By |
|---|---|
| `"Title is required"` | `WorkItem` domain entity |
| `"Title must not exceed 255 characters"` | `WorkItem` domain entity, `UpdateWorkItem` |
| `"Title cannot be empty"` | `UpdateWorkItem` |
| `"Description must not exceed 2000 characters"` | `WorkItem` domain entity, `UpdateWorkItem` |
| `"At least one field must be provided for update"` | `UpdateWorkItem` |
| `"Work item type name is required"` | `WorkItemType` domain entity |
| `"Work item type name must not exceed 255 characters"` | `WorkItemType` domain entity |
| `"Work item type description must not exceed 1000 characters"` | `WorkItemType` domain entity |
| `"Work item type with this name already exists in this workspace"` | `CreateWorkItemType` |
| `"Invalid status. Must be one of: DRAFT, ACTIVE, COMPLETED"` | `UpdateWorkItemStatus` |
| `"Work item is already in <status> status"` | `UpdateWorkItemStatus` |
| `"Cannot transition from <X> to <Y>. Valid transitions: DRAFT ↔ ACTIVE, ACTIVE ↔ COMPLETED"` | `UpdateWorkItemStatus` |
| `"Document is already linked to this work item"` | `WorkItemDocumentRepository` |
| `"Work item type cannot be deleted while work items are using it"` | `DeleteWorkItemType` |

---

## 401 — Unauthorised

Request is not authenticated. Token is missing, malformed, or expired.

| Message | Thrown By | When |
|---|---|---|
| `"No authorization token provided"` | `authMiddleware` | `Authorization` header missing entirely |
| `"Invalid authorization header format. Expected: Bearer <token>"` | `authMiddleware` | Header present but not `Bearer <token>` format |
| `"Invalid or expired token"` | `TokenServiceImpl` | `jwt.verify()` fails — token tampered or expired |
| `"Invalid email or password"` | `LoginUser` use case | Email not found OR password does not match |
| `"Authentication required"` | `rbacMiddleware` | RBAC middleware called without prior auth middleware (config bug) |
| `"Unauthorized"` | `AppError` default | Generic fallback |

> **Note:** Login errors always say "Invalid email or password" regardless of whether the email exists or the password is wrong — this prevents user enumeration.

---

## 403 — Forbidden

Authenticated but not allowed. User is known but lacks permission.

| Message | Thrown By | When |
|---|---|---|
| `"You are not a member of this workspace"` | `rbacMiddleware` | User exists but has no membership in the requested workspace |
| `"Access denied. Required role: <roles>. Your role: <role>"` | `rbacMiddleware` | Member found but role is below the required level |
| `"Workspace ID not found in request"` | `rbacMiddleware` | `workspaceId` not in `req.params` or `req.body` (route config issue) |
| `"Entity does not belong to this workspace"` | `DeleteEntity`, `UpdateEntity` | Entity found in DB but its `workspaceId` doesn't match the route |

---

## 404 — Not Found

Resource does not exist or is not accessible from the requesting workspace.

| Message | Thrown By |
|---|---|
| `"Tenant not found"` | `CreateWorkspace` |
| `"Workspace not found"` | `GetWorkspaceMembers`, `InviteUserToWorkspace`, `CreateEntity`, `CreateDocumentType` |
| `"Workspace member not found"` | `RemoveUserFromWorkspace`, `UpdateWorkspaceMember` |
| `"No user found with that email address"` | `InviteUserToWorkspace` |
| `"Entity not found"` | `DeleteEntity`, `UpdateEntity`, `GetEntityById`, `EntityRepository` |
| `"Entity not found in this workspace"` | `UploadDocument`, `CreateWorkItem` |
| `"Parent entity not found"` | `CreateEntity`, `UpdateEntity` |
| `"Document type not found"` | `DeleteDocumentType`, `AddField`, `UpdateDocumentType`, `GetDocumentTypeById` |
| `"Document type not found in this workspace"` | `UploadDocument`, `DeleteDocumentType`, `AddField`, `UpdateDocumentType`, `GetDocumentTypeById` |
| `"Document type not found after update"` | `UpdateDocumentType` (internal race — should not occur normally) |
| `"Document not found"` | `GetDocumentById`, `DeleteDocument`, `UpdateDocument` |
| `"Document not found in this workspace"` | `LinkDocument` |
| `"Work item not found"` | `GetWorkItemById`, `UpdateWorkItem`, `UpdateWorkItemStatus`, `DeleteWorkItem`, `UnlinkDocument`, `LinkDocument` |
| `"Work item type not found"` | `DeleteWorkItemType` |
| `"Work item type not found in this workspace"` | `CreateWorkItem` |
| `"Document link not found"` | `UnlinkDocument` |

---

## 409 — Conflict

A state conflict — duplicate resource or concurrent write collision.

| Message | Thrown By | When |
|---|---|---|
| `"User is already a member of this workspace"` | `WorkspaceMemberRepository` | Inviting a user who is already a member |
| `"A SELF entity already exists in this workspace."` | `CreateEntity`, `UpdateEntity` | Only one SELF-type entity per workspace |
| `"Work item status was changed concurrently. Please refresh and try again."` | `UpdateWorkItemStatus` | Optimistic lock: status changed between read and write by a concurrent request |

---

## 500 — Internal Server Error

Any unhandled exception that is not an `AppError`. Details are **never** sent to the client — only logged on the server.

```json
{
  "success": false,
  "error": {
    "message": "Internal server error",
    "statusCode": 500
  }
}
```

Common causes (server-side only, not exposed to client):
- MongoDB connection failure
- Mongoose schema conflict
- Unhandled promise rejection
- Null pointer in unexpected code path

---

## Error Handling Architecture

```
Use Case                   throws AppError subclass
      ↓
Controller                 calls next(error) — does NOT catch
      ↓
errorHandler.ts            catches ALL errors
      ↓
if error instanceof AppError  → res.status(err.statusCode).json({ error: { message, statusCode } })
else                          → log to console + res.status(500).json({ error: { message: "Internal server error" } })
```

**Why the controller does not catch errors itself:**
If every controller had a try/catch, error formatting logic would be duplicated everywhere. The global error handler in `app.ts` (added last with `app.use(errorHandler)`) centralises formatting. Controllers just call `next(error)` — a single, consistent pattern.

**Why 500 errors don't expose details:**
Stack traces and internal error messages can reveal database schemas, file paths, and library versions — useful information for an attacker. The server logs the full error; the client only sees "Internal server error".

---

*Error Catalogue — Version 1.0.0 — 2026-03-23*
*Auto-generated from source: `src/shared/domain/errors/AppError.ts` + all use cases*
