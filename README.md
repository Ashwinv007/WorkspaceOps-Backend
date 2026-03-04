# WorkspaceOps Backend

A multi-tenant workspace management API built with **Express.js**, **MongoDB**, and **TypeScript**. It provides comprehensive functionality for managing entities (customers, employees, vendors), documents with expiry tracking, work items, and full audit logging — with real-time updates via Socket.io.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [Workspaces](#workspaces)
  - [Entities](#entities)
  - [Document Types](#document-types)
  - [Documents](#documents)
  - [Work Item Types](#work-item-types)
  - [Work Items](#work-items)
  - [Audit Logs](#audit-logs)
  - [Overview](#overview)
- [Authentication & RBAC](#authentication--rbac)
- [Real-Time Events](#real-time-events)
- [Business Rules](#business-rules)
- [Project Structure](#project-structure)

---

## Features

- **Multi-tenant workspaces** — isolated data per workspace with role-based member access
- **Entity management** — track customers, employees, vendors, and other entities with custom roles
- **Document management** — upload files, attach metadata, track expiry (VALID / EXPIRING / EXPIRED)
- **Work item tracking** — tasks/activities with a status state machine and document linking
- **Flexible templates** — define reusable document types and work item types with custom fields
- **Audit logging** — automatic compliance trail for all write operations (queryable)
- **Dashboard overview** — aggregated counts by status/role across all resource types
- **Real-time updates** — Socket.io WebSocket events on the same port as the REST API
- **Interactive API docs** — Swagger UI at `/api-docs`

---

## Tech Stack

| Category | Technology | Version |
|---|---|---|
| Runtime | Node.js + Express.js | Express 5.2.1 |
| Language | TypeScript | 5.9.3 |
| Database | MongoDB + Mongoose | Mongoose 9.1.5 |
| Authentication | JWT (jsonwebtoken) | 9.0.3 |
| Password hashing | bcrypt | 6.0.0 |
| Real-time | Socket.io | 4.8.3 |
| File uploads | Multer | 2.0.2 |
| API docs | Swagger UI Express | 5.0.1 |
| Dev server | ts-node-dev | 2.0.0 |
| Linting | ESLint + Prettier | 9.39.2 / 3.8.1 |

---

## Architecture

The project follows **Clean Architecture** with four layers per module:

```
Domain → Application → Interfaces → Infrastructure
```

- **Domain** — entities, value objects, pure business logic
- **Application** — use cases that orchestrate domain logic
- **Interfaces** — HTTP controllers and response presenters
- **Infrastructure** — Mongoose repositories, external services

Dependency injection is done manually — each route file instantiates repositories, injects them into use cases, and injects use cases into controllers. No DI container is used.

```
src/
├── app.ts                         # Express setup, route registration, Swagger
├── server.ts                      # HTTP server + Socket.io initialization
├── config/
│   ├── database.ts                # MongoDB connection
│   └── env.ts                     # Environment variable loading
├── common/
│   └── middleware/                # Auth, RBAC, error handling
├── infrastructure/
│   ├── socket/                    # Socket.io server
│   └── idempotency/               # Duplicate-request prevention
├── shared/
│   └── domain/                    # Shared error classes, utilities
└── modules/
    ├── auth/
    ├── workspace/
    ├── entity/
    ├── document-type/
    ├── document/
    ├── work-item/
    ├── audit-log/
    └── overview/
```

Each module contains its own `domain/`, `application/use-cases/`, `interfaces/`, and `infrastructure/` subdirectories.

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Installation

```bash
git clone <repo-url>
cd workspaceops-backend
npm install
```

### Configuration

```bash
cp .env.example .env
# Edit .env with your values (see Environment Variables section)
```

### Development

```bash
npm run dev
# Server starts on http://localhost:4000 with hot reload
```

### Production

```bash
npm run build      # Compile TypeScript → dist/
npm start          # Run dist/server.js
```

### Verify

```bash
# Health check (no auth required)
curl http://localhost:4000/health

# Interactive API docs
open http://localhost:4000/api-docs
```

### Type checking

```bash
npx tsc --noEmit
```

---

## Environment Variables

Copy `.env.example` to `.env` and set the following:

```env
# Server
PORT=4000

# Database — choose one
MONGO_URI=mongodb://localhost:27017/workspaceops
# MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/workspaceops?retryWrites=true&w=majority

# Authentication
JWT_SECRET=change_this_to_a_long_random_string_in_production

# File storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10

# Business logic
EXPIRY_WARNING_DAYS=30        # Documents expiring within N days are flagged as EXPIRING

# CORS
FRONTEND_URL=http://localhost:3000
```

---

## API Reference

All endpoints (except auth and `/health`) require a valid JWT token:

```
Authorization: Bearer <token>
```

### Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/signup` | None | Register a new user (creates a default workspace) |
| `POST` | `/auth/login` | None | Login and receive a JWT token |

**Signup request:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securepassword"
}
```

**Signup response:**
```json
{
  "success": true,
  "data": {
    "userId": "...",
    "workspaceId": "...",
    "token": "eyJ..."
  },
  "message": "User registered successfully"
}
```

**Login request:**
```json
{
  "email": "jane@example.com",
  "password": "securepassword"
}
```

**Login response:**
```json
{
  "success": true,
  "data": {
    "userId": "...",
    "token": "eyJ..."
  }
}
```

---

### Workspaces

| Method | Path | Role Required | Description |
|---|---|---|---|
| `POST` | `/workspaces` | Authenticated | Create a new workspace |
| `GET` | `/workspaces` | Authenticated | List all workspaces the user belongs to |
| `GET` | `/workspaces/:id/members` | ADMIN+ | List workspace members |
| `POST` | `/workspaces/:id/members` | ADMIN+ | Invite a user by email |
| `PUT` | `/workspaces/:id/members/:memberId` | ADMIN+ | Update a member's role |
| `DELETE` | `/workspaces/:id/members/:memberId` | ADMIN+ | Remove a member |

**Invite member request body:**
```json
{
  "invitedEmail": "user@example.com",
  "role": "MEMBER"
}
```

---

### Entities

| Method | Path | Role Required | Description |
|---|---|---|---|
| `POST` | `/workspaces/:workspaceId/entities` | MEMBER+ | Create a new entity |
| `GET` | `/workspaces/:workspaceId/entities` | MEMBER+ | List entities (filterable by `role`) |
| `GET` | `/workspaces/:workspaceId/entities/:id` | MEMBER+ | Get a single entity |
| `PUT` | `/workspaces/:workspaceId/entities/:id` | MEMBER+ | Update an entity |
| `DELETE` | `/workspaces/:workspaceId/entities/:id` | ADMIN+ | Delete an entity |

**Create entity request:**
```json
{
  "name": "Acme Corp",
  "role": "CUSTOMER"
}
```

**Entity response:**
```json
{
  "id": "...",
  "workspaceId": "...",
  "name": "Acme Corp",
  "role": "CUSTOMER",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

**List response:**
```json
{
  "entities": [...],
  "count": 5
}
```

---

### Document Types

Define reusable templates for documents, with optional custom metadata fields and expiry tracking.

| Method | Path | Role Required | Description |
|---|---|---|---|
| `POST` | `/workspaces/:workspaceId/document-types` | ADMIN+ | Create a document type |
| `GET` | `/workspaces/:workspaceId/document-types` | MEMBER+ | List all document types |
| `GET` | `/workspaces/:workspaceId/document-types/:id` | MEMBER+ | Get document type with fields |
| `PUT` | `/workspaces/:workspaceId/document-types/:id` | ADMIN+ | Update a document type |
| `POST` | `/workspaces/:workspaceId/document-types/:id/fields` | ADMIN+ | Add a metadata field |
| `DELETE` | `/workspaces/:workspaceId/document-types/:id` | ADMIN+ | Delete a document type |

**Create document type request:**
```json
{
  "name": "Insurance Certificate",
  "hasMetadata": true,
  "hasExpiry": true,
  "fields": [
    { "fieldName": "Policy Number", "fieldType": "text", "isRequired": true },
    { "fieldName": "Expiry Date", "fieldType": "date", "isRequired": true, "isExpiryField": true }
  ]
}
```

> Note: `fieldType` must be lowercase — `"text"` or `"date"`.
> If `hasMetadata: true`, at least one field is required.
> If `hasExpiry: true`, at least one field must have `isExpiryField: true` and `fieldType: "date"`.

---

### Documents

| Method | Path | Role Required | Description |
|---|---|---|---|
| `POST` | `/workspaces/:workspaceId/documents` | MEMBER+ | Upload a document (`multipart/form-data`) |
| `GET` | `/workspaces/:workspaceId/documents` | MEMBER+ | List documents (filterable by `expiryStatus`, `entityId`) |
| `GET` | `/workspaces/:workspaceId/documents/expiring` | MEMBER+ | List only expiring or expired documents |
| `GET` | `/workspaces/:workspaceId/documents/:id` | MEMBER+ | Get a single document |
| `GET` | `/workspaces/:workspaceId/documents/:id/download` | MEMBER+ | Download the file (binary stream) |
| `GET` | `/workspaces/:workspaceId/entities/:entityId/documents` | MEMBER+ | List an entity's documents |
| `PUT` | `/workspaces/:workspaceId/documents/:id` | MEMBER+ | Update document metadata |
| `DELETE` | `/workspaces/:workspaceId/documents/:id` | ADMIN+ | Delete a document |

**Upload request** (`multipart/form-data`):
```
file          (binary)
documentTypeId
entityId
metadata      (JSON string of field values)
```

**Document response:**
```json
{
  "id": "...",
  "workspaceId": "...",
  "entityId": "...",
  "documentTypeId": "...",
  "fileName": "certificate.pdf",
  "expiryStatus": "EXPIRING",
  "downloadUrl": "/workspaces/.../documents/.../download",
  "metadata": { "Policy Number": "POL-1234", "Expiry Date": "2026-06-01" },
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

**Expiry statuses:** `VALID` | `EXPIRING` | `EXPIRED`

---

### Work Item Types

| Method | Path | Role Required | Description |
|---|---|---|---|
| `POST` | `/workspaces/:workspaceId/work-item-types` | ADMIN+ | Create a work item type |
| `GET` | `/workspaces/:workspaceId/work-item-types` | MEMBER+ | List all work item types |
| `DELETE` | `/workspaces/:workspaceId/work-item-types/:id` | ADMIN+ | Delete a work item type |

---

### Work Items

| Method | Path | Role Required | Description |
|---|---|---|---|
| `POST` | `/workspaces/:workspaceId/work-items` | MEMBER+ | Create a work item |
| `GET` | `/workspaces/:workspaceId/work-items` | MEMBER+ | List work items (filterable by status, entityId, typeId) |
| `GET` | `/workspaces/:workspaceId/work-items/:id` | MEMBER+ | Get a single work item |
| `PUT` | `/workspaces/:workspaceId/work-items/:id` | MEMBER+ | Update work item fields |
| `PATCH` | `/workspaces/:workspaceId/work-items/:id/status` | MEMBER+ | Transition status |
| `POST` | `/workspaces/:workspaceId/work-items/:id/documents` | MEMBER+ | Link a document to a work item |
| `GET` | `/workspaces/:workspaceId/work-items/:id/documents` | MEMBER+ | Get linked documents |
| `DELETE` | `/workspaces/:workspaceId/work-items/:id/documents/:docId` | MEMBER+ | Unlink a document |
| `DELETE` | `/workspaces/:workspaceId/work-items/:id` | ADMIN+ | Delete a work item |
| `GET` | `/workspaces/:workspaceId/entities/:entityId/work-items` | MEMBER+ | List an entity's work items |

**Status state machine:**
```
DRAFT ↔ ACTIVE ↔ COMPLETED
```
Valid transitions: `DRAFT → ACTIVE`, `ACTIVE → DRAFT`, `ACTIVE → COMPLETED`, `COMPLETED → ACTIVE`
Invalid: `DRAFT ↔ COMPLETED` (no direct transition)

**Work item response:**
```json
{
  "id": "...",
  "workspaceId": "...",
  "entityId": "...",
  "workItemTypeId": "...",
  "title": "Annual review",
  "description": "...",
  "status": "ACTIVE",
  "linkedDocumentIds": ["...", "..."],
  "linkedDocumentCount": 2,
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

---

### Audit Logs

All write operations are automatically recorded. Logs are query-only.

| Method | Path | Role Required | Description |
|---|---|---|---|
| `GET` | `/workspaces/:workspaceId/audit-logs` | ADMIN+ | Query audit logs |

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `userId` | string | Filter by actor |
| `action` | string | Filter by action type (e.g. `CREATE`, `UPDATE`, `DELETE`) |
| `targetType` | string | Filter by resource type (e.g. `document`, `workItem`) |
| `targetId` | string | Filter by specific resource ID |
| `fromDate` | ISO string | Start of date range |
| `toDate` | ISO string | End of date range |
| `limit` | number | Page size (default: 20) |
| `offset` | number | Pagination offset (default: 0) |

**Response:**
```json
{
  "total": 150,
  "limit": 20,
  "offset": 0,
  "logs": [
    {
      "id": "...",
      "workspaceId": "...",
      "userId": "...",
      "action": "CREATE",
      "targetType": "document",
      "targetId": "...",
      "metadata": {},
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Overview

| Method | Path | Role Required | Description |
|---|---|---|---|
| `GET` | `/workspaces/:workspaceId/overview` | MEMBER+ | Dashboard aggregation |

**Response:**
```json
{
  "workspaceId": "...",
  "entities": {
    "total": 10,
    "byRole": { "CUSTOMER": 5, "EMPLOYEE": 3, "VENDOR": 2 }
  },
  "documents": {
    "total": 42,
    "byStatus": { "VALID": 30, "EXPIRING": 8, "EXPIRED": 4 }
  },
  "workItems": {
    "total": 18,
    "byStatus": { "DRAFT": 5, "ACTIVE": 9, "COMPLETED": 4 }
  },
  "documentTypes": [...],
  "workItemTypes": [...]
}
```

---

## Authentication & RBAC

All workspace-scoped endpoints enforce role-based access control. Roles are per workspace (a user can be OWNER in one workspace and MEMBER in another).

| Role | Capabilities |
|---|---|
| **OWNER** | Full control including workspace settings and member management |
| **ADMIN** | Manage members, create/delete types and resources |
| **MEMBER** | Create and read most resources; update own work |
| **VIEWER** | Read-only (reserved) |

The `workspaceId` is read from the route parameter (`req.params.workspaceId` or `req.params.id`).

---

## Real-Time Events

Socket.io runs on the same port as the REST API (4000). Clients must authenticate with a valid JWT token on connect.

**Connect with auth:**
```js
const socket = io("http://localhost:4000", {
  auth: { token: "Bearer eyJ..." }
});
```

**Join a workspace room:**
```js
socket.emit("join-workspace", { workspaceId: "..." });
```

Once joined, the client receives events when workspace resources change. Events follow REST semantics (create, update, delete) and include the updated resource payload.

---

## Business Rules

### Document types
- `hasMetadata: true` requires at least one field defined in `fields[]`
- `hasExpiry: true` requires at least one field with both `isExpiryField: true` and `fieldType: "date"`
- Field types are **lowercase strings**: `"text"` or `"date"` (not `"TEXT"` / `"DATE"`)

### Documents
- Expiry status is computed on the fly (not stored): documents within `EXPIRY_WARNING_DAYS` are `EXPIRING`; past-expiry are `EXPIRED`

### Work items
- Status transitions must follow the state machine — no skipping states
- Documents can be linked to multiple work items

### Member invites
- Invite by `invitedEmail` (email address of an existing registered user)
- Each user can hold only one role per workspace

### Audit logging
- Implemented as a fire-and-forget injectable service
- Failures are silently ignored and never propagate to the request/response cycle

---

## Project Structure

```
workspaceops-backend/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   │   ├── database.ts
│   │   └── env.ts
│   ├── common/
│   │   └── middleware/
│   │       ├── auth.middleware.ts
│   │       └── rbac.middleware.ts
│   ├── infrastructure/
│   │   ├── socket/
│   │   └── idempotency/
│   ├── shared/
│   │   └── domain/
│   └── modules/
│       ├── auth/
│       ├── workspace/
│       ├── entity/
│       ├── document-type/
│       ├── document/
│       ├── work-item/
│       ├── audit-log/
│       └── overview/
├── swagger.yaml               # OpenAPI specification
├── .env.example               # Environment variable template
├── tsconfig.json
├── package.json
└── PLAN/
    ├── implementation_plan.md
    ├── audit_log_implementation_plan.md
    └── test_report.md
```
