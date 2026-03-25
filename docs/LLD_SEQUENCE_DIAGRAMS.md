# LLD — Sequence Diagrams

> **Document Type:** Low Level Design — Sequence Diagrams
> **Part of:** LLD (Low Level Design)
> **Related:** [HLD.md](./HLD.md) · [State Machines](./LLD_STATE_MACHINES.md) · [API Documentation](../API_DOCUMENTATION.md)

A **sequence diagram** shows exactly how objects/components communicate with each other **over time**, for a specific scenario. It's the most useful LLD diagram — it forces you to think through every step of a flow including error cases.

Arrows:
- `→` solid: calling a method / sending a request
- `-->` dashed: returning a value / sending a response

---

## Table of Contents

1. [Flow 1 — User Login](#flow-1--user-login-post-authlogin)
2. [Flow 2 — Upload Document](#flow-2--upload-document-post-workspacesworkspaceidocuments)
3. [Flow 3 — Update Work Item Status](#flow-3--update-work-item-status-patch-workspacesworkspaceidwork-itemsidstatus)

---

## Flow 1 — User Login (`POST /auth/login`)

### What this flow covers
A user submits their email and password. The API verifies the credentials, signs a JWT, and returns it. No auth middleware needed — this is a public endpoint.

### Happy Path

```mermaid
sequenceDiagram
    participant C as Client (Browser)
    participant AC as AuthController
    participant LU as LoginUser (UseCase)
    participant UR as MongoUserRepository
    participant TS as TokenServiceImpl
    participant DB as MongoDB

    C->>AC: POST /auth/login\n{ email, password }

    AC->>LU: execute({ email, password })

    LU->>UR: findByEmail(email)
    UR->>DB: UserModel.findOne({ email })
    DB-->>UR: User document
    UR-->>LU: User { id, email, passwordHash }

    LU->>TS: comparePassword(password, passwordHash)
    Note over TS: bcrypt.compare()\n~100ms intentionally slow
    TS-->>LU: true

    LU->>TS: generateToken(userId, email)
    Note over TS: jwt.sign({ userId, email },\nJWT_SECRET, { expiresIn: '24h' })
    TS-->>LU: jwt_token_string

    LU-->>AC: { userId, token }
    AC-->>C: 200 OK\n{ userId, token }
```

### Error Paths

```mermaid
sequenceDiagram
    participant C as Client
    participant AC as AuthController
    participant LU as LoginUser (UseCase)
    participant UR as MongoUserRepository
    participant EH as errorHandler (Global)

    Note over C,EH: Error Path A — User not found

    C->>AC: POST /auth/login { email, password }
    AC->>LU: execute({ email, password })
    LU->>UR: findByEmail(email)
    UR-->>LU: null (no user found)
    LU-->>AC: throws UnauthorizedError\n"Invalid email or password"
    AC->>EH: next(error)
    EH-->>C: 401 Unauthorized\n{ error: "Invalid email or password" }

    Note over C,EH: Error Path B — Wrong password

    C->>AC: POST /auth/login { email, wrongPassword }
    AC->>LU: execute({ email, wrongPassword })
    LU->>UR: findByEmail(email)
    UR-->>LU: User found
    LU->>LU: bcrypt.compare() → false
    LU-->>AC: throws UnauthorizedError\n"Invalid email or password"
    AC->>EH: next(error)
    EH-->>C: 401 Unauthorized
```

> **Security note:** Both "user not found" and "wrong password" return the exact same error message `"Invalid email or password"`. This is intentional — if you returned "user not found", an attacker could enumerate valid email addresses by trying different emails. Same message = no information leak.

---

## Flow 2 — Upload Document (`POST /workspaces/:workspaceId/documents`)

### What this flow covers
An authenticated MEMBER uploads a document. The request goes through JWT verification, RBAC check, then the use case validates the document type, the entity, the metadata, creates the domain object, persists it, fires an audit log, and returns the result. Socket.io event emitted at the end.

### Happy Path

```mermaid
sequenceDiagram
    participant C as Client
    participant NX as Nginx (prod)
    participant MW as authMiddleware
    participant RB as requireMember
    participant DC as DocumentController
    participant UC as UploadDocument (UseCase)
    participant DTR as DocTypeRepository
    participant ER as EntityRepository
    participant DR as DocumentRepository
    participant AL as AuditLogService
    participant IO as Socket.io
    participant DB as MongoDB

    C->>NX: POST /workspaces/:workspaceId/documents\nAuthorization: Bearer <token>\nContent-Type: multipart/form-data\n{ file, documentTypeId, entityId, metadata }

    NX->>MW: Proxy to :4000 (HTTP internally)

    Note over MW: Extract "Bearer <token>"\njwt.verify(token, JWT_SECRET)\nAttach req.user = { userId, email }
    MW->>RB: next() — token valid

    Note over RB: workspaceId = req.params.workspaceId\nDB lookup: WorkspaceMember\n{ userId, workspaceId }\nCheck role ∈ [OWNER, ADMIN, MEMBER]
    RB->>DC: next() — role is MEMBER ✓

    DC->>UC: execute(dto, fileUrl)

    UC->>DTR: findById(documentTypeId, workspaceId)
    DTR->>DB: DocumentTypeModel.findOne(...)
    DB-->>DTR: DocumentType document
    DTR-->>UC: DocumentType { hasMetadata, hasExpiry, fields[] }

    UC->>ER: findById(entityId, workspaceId)
    ER->>DB: EntityModel.findOne(...)
    DB-->>ER: Entity document
    ER-->>UC: Entity ✓

    Note over UC: Validate metadata:\nif hasMetadata=true and\nno metadata fields → ValidationError

    UC->>UC: Document.create(...)\n(domain factory — pure function)

    UC->>DR: create(documentDomainObject)
    DR->>DB: DocumentModel.create(...)
    DB-->>DR: Saved document
    DR-->>UC: Document { id, expiryStatus, ... }

    UC->>AL: log({ action: DOCUMENT_UPLOADED, ... })
    Note over AL: Fire-and-forget\nawait not used\nnever blocks main flow

    UC-->>DC: Document

    DC->>IO: io.to(workspaceId).emit\n('document:created', { workspaceId, document })
    Note over IO: All clients in this\nworkspace room receive\nthe event instantly

    DC-->>C: 201 Created\n{ id, fileName, expiryStatus,\ndownloadUrl, metadata, ... }
```

### Error Paths

```mermaid
sequenceDiagram
    participant C as Client
    participant MW as authMiddleware
    participant RB as requireMember
    participant DC as DocumentController
    participant UC as UploadDocument (UseCase)
    participant EH as errorHandler

    Note over C,EH: Error A — No token
    C->>MW: POST /documents (no Authorization header)
    MW-->>EH: throws UnauthorizedError
    EH-->>C: 401 { error: "No authorization token provided" }

    Note over C,EH: Error B — Not a workspace member
    C->>MW: POST /documents (valid token)
    MW->>RB: next()
    RB->>RB: DB lookup → no membership found
    RB-->>EH: throws ForbiddenError
    EH-->>C: 403 { error: "You are not a member of this workspace" }

    Note over C,EH: Error C — Document type not found
    C->>DC: (auth + rbac passed)
    DC->>UC: execute(dto, fileUrl)
    UC->>UC: documentTypeRepo.findById() → null
    UC-->>EH: throws NotFoundError\n"Document type not found in this workspace"
    EH-->>C: 404 { error: "Document type not found in this workspace" }

    Note over C,EH: Error D — Missing required metadata
    C->>DC: (auth + rbac + docType found)
    DC->>UC: execute(dto, fileUrl)
    UC->>UC: docType.hasMetadata=true\nbut dto.metadata is empty
    UC-->>EH: throws ValidationError\n"This document type requires metadata fields"
    EH-->>C: 400 { error: "This document type requires metadata fields" }
```

---

## Flow 3 — Update Work Item Status (`PATCH /workspaces/:workspaceId/work-items/:id/status`)

### What this flow covers
An authenticated MEMBER changes a work item's status (e.g., DRAFT → ACTIVE). The use case fetches the current state, validates the transition using the domain's `canTransitionTo()` method, does a **conditional update** (optimistic locking) to guard against concurrent changes, then fires the audit log.

### Happy Path

```mermaid
sequenceDiagram
    participant C as Client
    participant MW as authMiddleware
    participant RB as requireMember
    participant WC as WorkItemController
    participant UC as UpdateWorkItemStatus (UseCase)
    participant WR as MongoWorkItemRepository
    participant AL as AuditLogService
    participant DB as MongoDB

    C->>MW: PATCH /workspaces/:workspaceId/work-items/:id/status\nAuthorization: Bearer <token>\n{ "status": "ACTIVE" }

    Note over MW: jwt.verify(token) → req.user ✓
    MW->>RB: next()

    Note over RB: lookup WorkspaceMember → role = MEMBER ✓
    RB->>WC: next()

    WC->>UC: execute(id, workspaceId, "ACTIVE", userId)

    Note over UC: Step 1: Validate "ACTIVE" is\na valid WorkItemStatus enum value

    UC->>WR: findById(id, workspaceId)
    WR->>DB: WorkItemModel.findOne({ _id: id, workspaceId })
    DB-->>WR: WorkItem document { status: "DRAFT", ... }
    WR-->>UC: WorkItem { id, status: DRAFT, ... }

    Note over UC: Step 2: Check not already ACTIVE
    Note over UC: Step 3: item.canTransitionTo(ACTIVE)\nDRAFT → ACTIVE ✓ allowed

    UC->>WR: updateStatus(id, workspaceId,\nnewStatus: ACTIVE,\ncurrentStatus: DRAFT)
    Note over WR: Conditional update:\nfindOneAndUpdate({ _id, workspaceId,\nstatus: "DRAFT" }, { status: "ACTIVE" })\nOnly updates if status is still DRAFT
    WR->>DB: findOneAndUpdate with filter on current status
    DB-->>WR: Updated WorkItem
    WR-->>UC: WorkItem { id, status: ACTIVE, ... }

    UC->>AL: log({ action: WORK_ITEM_STATUS_CHANGED, ... })
    Note over AL: Fire-and-forget

    UC-->>WC: WorkItem { id, status: ACTIVE }
    WC-->>C: 200 OK\n{ id, status: "ACTIVE", ... }
```

### Error Paths

```mermaid
sequenceDiagram
    participant C as Client
    participant UC as UpdateWorkItemStatus (UseCase)
    participant WR as MongoWorkItemRepository
    participant EH as errorHandler

    Note over C,EH: Error A — Invalid status value
    C->>UC: execute(id, workspaceId, "STARTED", userId)
    UC->>UC: "STARTED" not in WorkItemStatus enum
    UC-->>EH: throws ValidationError\n"Invalid status. Must be one of: DRAFT, ACTIVE, COMPLETED"
    EH-->>C: 400

    Note over C,EH: Error B — Work item not found
    C->>UC: execute(id, workspaceId, "ACTIVE", userId)
    UC->>WR: findById(id, workspaceId)
    WR-->>UC: null
    UC-->>EH: throws NotFoundError "Work item not found"
    EH-->>C: 404

    Note over C,EH: Error C — Invalid state transition (DRAFT → COMPLETED)
    C->>UC: execute(id, workspaceId, "COMPLETED", userId)
    UC->>WR: findById → WorkItem { status: DRAFT }
    UC->>UC: item.canTransitionTo(COMPLETED)\nDRAFT → COMPLETED ✗ blocked
    UC-->>EH: throws ValidationError\n"Cannot transition from DRAFT to COMPLETED.\nValid transitions: DRAFT ↔ ACTIVE, ACTIVE ↔ COMPLETED"
    EH-->>C: 400

    Note over C,EH: Error D — Concurrent update (optimistic lock conflict)
    C->>UC: execute(id, workspaceId, "ACTIVE", userId)
    Note over UC: Read: status = DRAFT\n(another request changes it to ACTIVE\nbetween our read and write)
    UC->>WR: updateStatus(..., currentStatus: DRAFT)
    Note over WR: findOneAndUpdate filter:\n{ status: "DRAFT" } — no longer matches!\nreturns null
    WR-->>UC: null
    UC-->>EH: throws ConflictError\n"Work item status was changed concurrently.\nPlease refresh and try again."
    EH-->>C: 409 Conflict
```

> **Optimistic Locking explained:** Instead of locking the row before updating (pessimistic), we let multiple requests read freely. When writing, we include the **expected current state** in the WHERE clause: `findOneAndUpdate({ _id, status: "DRAFT" }, { status: "ACTIVE" })`. If another request already changed the status, our filter matches nothing and returns null — we detect the conflict and return 409 instead of silently overwriting.

*LLD Sequence Diagrams — Version 1.0.0 — 2026-03-23*
*For state machine diagrams, see [LLD_STATE_MACHINES.md](./LLD_STATE_MACHINES.md)*