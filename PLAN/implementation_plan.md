# WorkspaceOps Backend - Implementation Plan

## Project Overview

WorkspaceOps is a multi-tenant workspace management system with document tracking, entity management, work items, and compliance features. This is a **backend-only** implementation using **Clean Architecture** principles with modular design.

**Scope**: 30-day MVP as defined in HLRs (HLR0001-HLR0034)

---

## Current Status Analysis

### ✅ What's Already Done

#### Infrastructure
- Basic Express.js server setup (`src/server.ts`, `src/app.ts`)
- MongoDB connection configuration (`src/config/database.ts`)
- Environment configuration (`src/config/env.ts`)
- TypeScript configuration
- Package dependencies (Express, Mongoose, JWT, bcrypt)
- Auth routes registered in main app (`app.ts`)

#### Auth Module (HLR0001-0002) - **~80% Complete**
- ✅ **User Model** - Mongoose schema with email, passwordHash, name, timestamps
- ✅ **Auth Repository** - `findByEmail()`, `createUser()` methods
- ✅ **Auth Service** - Complete signup flow:
  - Email uniqueness check
  - Password hashing (bcrypt)
  - User creation
  - **Tenant auto-creation**
  - **Default workspace auto-creation**
  - **WorkspaceUser with OWNER role**
  - JWT token generation (7-day expiry)
- ✅ **Auth Controller** - Signup endpoint handler with error handling
- ✅ **Auth Routes** - `/auth/signup` endpoint configured
- ❌ **Login endpoint** - Not yet implemented

#### Workspace Models (HLR0002-0003) - **100% Complete**
- ✅ **Tenant Model** - Mongoose schema with name, timestamps
- ✅ **Workspace Model** - Mongoose schema with tenantId reference, name, timestamps
- ✅ **WorkspaceUser Model** - Mongoose schema with:
  - workspaceId and userId references
  - Role enum: OWNER, ADMIN, MEMBER, VIEWER
  - Timestamps

#### Documentation
- Comprehensive planning documents (HLRs, FRDs, ER diagrams, flow diagrams)
- Updated implementation plan and task breakdown

### ⚠️ What's In Progress

- **Login functionality** - Auth service needs login method
- **JWT middleware** - For route protection (not yet created)
- **Workspace services** - Invite user, get workspaces, etc.

### ❌ What's Missing

#### Critical Missing Modules
1. **Entity Module** (HLR0008-0010) - not created
2. **Document-Type Module** (HLR0011-0013) - not created
3. **Document Module** (HLR0014-0020) - not created
4. **Work-Item-Type Module** (HLR0021) - not created
5. **Work-Item Module** (HLR0022-0025) - not created
6. **Audit Module** (HLR0026-0027) - not created
7. **Overview Module** (HLR0028-0029) - not created

#### Infrastructure Gaps
- No RBAC middleware (HLR0005-0007)
- No authentication middleware
- No error handling middleware
- No request validation utilities
- No response formatting utilities
- No file upload handling for documents

---

## HLR Completion Status

| HLR ID | Requirement | Status | Notes |
|--------|-------------|--------|-------|
| **HLR0001** | User signup & tenant creation | 🟡 80% Complete | Signup works,  login missing |
| **HLR0002** | Default workspace creation | ✅ Complete | Auto-created on signup |
| **HLR0003** | Workspace as boundary | ✅ Architectural | Enforced by design |
| **HLR0004** | Invite users | ❌ Not Started | No workspace service |
| **HLR0005** | One role per user/workspace | ✅ Complete | Schema enforces uniqueness |
| **HLR0006** | Support 4 roles | ✅ Complete | Enum defined in model |
| **HLR0007** | Restrict by role | ❌ Not Started | RBAC middleware missing |
| **HLR0008-0010** | Entity management | ❌ Not Started | Module doesn't exist |
| **HLR0011-0013** | Document type config | ❌ Not Started | Module doesn't exist |
| **HLR0014-0018** | Document management | ❌ Not Started | Module doesn't exist |
| **HLR0019-0020** | Document expiry | ❌ Not Started | Logic not implemented |
| **HLR0021** | Work item types | ❌ Not Started | Module doesn't exist |
| **HLR0022-0025** | Work item lifecycle | ❌ Not Started | Module doesn't exist |
| **HLR0026-0027** | Audit logging | ❌ Not Started | Module doesn't exist |
| **HLR0028-0029** | Overview (counts) | ❌ Not Started | Module doesn't exist |
| **HLR0030-0034** | Non-requirements | ✅ Compliant | No invoicing, SLA, notifications |

**Summary**: **3 out of 27 functional HLRs fully implemented, 1 in progress (80%).**  
**Overall Progress: ~15% complete**

---

## Approved Clean Architecture

> **See [clean_architecture_design.md](file:///home/ashwin/.gemini/antigravity/brain/17f6d29e-0889-479a-8e17-ea66e67fadb1/clean_architecture_design.md) for detailed architecture documentation.**

### Core Principle: Dependencies Point INWARD Only

```
Infrastructure → Interfaces → Application → Domain
(Mongoose/AWS)   (HTTP/UI)    (Use Cases)    (Pure Business Logic)
```

### Four-Layer Structure (Example: Auth Module)

```
modules/auth/
├── domain/                         # Pure business logic (no frameworks)
│   ├── entities/
│   │   └── User.ts                 # Plain TypeScript class
│   ├── repositories/
│   │   └── IUserRepository.ts      # Interface (contract)
│   └── value-objects/
│       └── Email.ts                # Immutable value
│
├── application/                    # Use cases & orchestration
│   ├── use-cases/
│   │   ├── SignupUser.ts           # Business workflow
│   │   └── LoginUser.ts
│   ├── dto/
│   │   ├── SignupDTO.ts            # Input/output objects
│   │   └── LoginDTO.ts
│   └── services/
│       └── ITokenService.ts        # Service interface
│
├── interfaces/                     # HTTP adapters
│   ├── http/
│   │   └── AuthController.ts       # Express handlers
│   └── presenters/
│       └── UserPresenter.ts        # Response formatting
│
└── infrastructure/                 # Framework implementations
    ├── mongoose/
    │   ├── UserModel.ts            # Mongoose schema
    │   └── UserRepositoryImpl.ts   # Implements IUserRepository
    ├── jwt/
    │   └── TokenServiceImpl.ts     # Implements ITokenService
    └── routes/
        └── auth.routes.ts          # Express routes + DI
```

### Layer Responsibilities

#### 1. Domain Layer (Core)
- **Pure TypeScript** - No framework dependencies
- **Contains**: Entities, Value Objects, Repository Interfaces, Enums
- **Rules**: Business validation, domain logic only
- **Example**: `User` entity with email validation, password rules

#### 2. Application Layer (Use Cases)
- **Orchestrates** domain objects via interfaces
- **Contains**: Use cases, DTOs, Application services
- **Rules**: Application workflows, cross-entity operations
- **Example**: `SignupUser` use case coordinates user/tenant/workspace creation

#### 3. Interfaces Layer (Adapters)
- **Adapts** external world to application
- **Contains**: Controllers, Presenters, Middleware
- **Rules**: HTTP-specific, calls use cases, formats responses
- **Example**: `AuthController` transforms HTTP request → DTO → Use Case → HTTP response

#### 4. Infrastructure Layer (Technical Details)
- **Implements** domain/application interfaces
- **Contains**: Mongoose models, Repository implementations, JWT service, Routes
- **Rules**: Framework code, database access, external APIs
- **Example**: `UserRepositoryImpl` uses Mongoose to implement `IUserRepository`

### Dependency Injection

Manual DI in route files for MVP:
```typescript
// infrastructure/routes/auth.routes.ts
const userRepo = new UserRepositoryImpl();
const tokenService = new TokenServiceImpl();
const signupUseCase = new SignupUser(userRepo, tenantRepo, workspaceRepo, tokenService);
const controller = new AuthController(signupUseCase, loginUseCase);
```

---

## Proposed Changes

### Phase 1: Foundation & Infrastructure

#### [NEW] [common/middleware/auth.middleware.ts](file:///home/ashwin/Projects/workspaceops-backend/src/common/middleware/auth.middleware.ts)
JWT authentication middleware to protect routes and extract user context.

#### [NEW] [common/middleware/rbac.middleware.ts](file:///home/ashwin/Projects/workspaceops-backend/src/common/middleware/rbac.middleware.ts)
Role-based access control middleware enforcing workspace permissions (OWNER, ADMIN, MEMBER, VIEWER).

#### [NEW] [common/middleware/errorHandler.ts](file:///home/ashwin/Projects/workspaceops-backend/src/common/middleware/errorHandler.ts)
Global error handling middleware with proper HTTP status codes and error formatting.

#### [NEW] [common/middleware/validator.ts](file:///home/ashwin/Projects/workspaceops-backend/src/common/middleware/validator.ts)
Request validation utilities using schemas.

#### [NEW] [common/utils/response.ts](file:///home/ashwin/Projects/workspaceops-backend/src/common/utils/response.ts)
Standardized API response formatting.

#### [NEW] [common/utils/logger.ts](file:///home/ashwin/Projects/workspaceops-backend/src/common/utils/logger.ts)
Logging utility for structured logging.

#### [NEW] [common/utils/fileUpload.ts](file:///home/ashwin/Projects/workspaceops-backend/src/common/utils/fileUpload.ts)
File upload handling using Multer (for document uploads).

---

### Phase 2: Authentication & User Management (HLR0001, HLR0004-0007)

#### [MODIFY] [user.model.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/auth/user.model.ts)
Implement Mongoose schema for User with email validation, password hashing, and timestamps.

#### [MODIFY] [auth.repository.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/auth/auth.repository.ts)
Data access methods: createUser, findUserByEmail, findUserById.

#### [MODIFY] [auth.service.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/auth/auth.service.ts)
Business logic: signup (create user + tenant + workspace), login, token generation.

#### [MODIFY] [auth.controller.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/auth/auth.controller.ts)
Request handlers: POST /auth/signup, POST /auth/login.

#### [MODIFY] [auth.routes.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/auth/auth.routes.ts)
Route definitions for authentication endpoints.

---

### Phase 3: Workspace & Tenant (HLR0001-0003)

#### [MODIFY] [tenant.model.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/workspace/tenant.model.ts)
Mongoose schema for Tenant with name and timestamps.

#### [MODIFY] [workspace.model.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/workspace/workspace.model.ts)
Mongoose schema for Workspace with tenantId reference and name.

#### [MODIFY] [workspaceUser.model.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/workspace/workspaceUser.model.ts)
Mongoose schema for WorkspaceUser with role enum (OWNER, ADMIN, MEMBER, VIEWER) and unique constraint.

#### [NEW] [workspace.repository.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/workspace/workspace.repository.ts)
Data access: createTenant, createWorkspace, createWorkspaceUser, getUserWorkspaces, getUserRoleInWorkspace.

#### [NEW] [workspace.service.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/workspace/workspace.service.ts)
Business logic: inviteUser (with RBAC check), getWorkspaces, checkPermission.

#### [NEW] [workspace.controller.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/workspace/workspace.controller.ts)
Request handlers: POST /workspaces/:id/invite, GET /workspaces.

#### [NEW] [workspace.routes.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/workspace/workspace.routes.ts)
Route definitions with RBAC middleware.

---

### Phase 4: Entity Management (HLR0008-0010)

#### [NEW] [entity.model.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/entity/entity.model.ts)
Mongoose schema for Entity with role enum (SELF, CUSTOMER, EMPLOYEE, VENDOR) and workspace reference.

#### [NEW] [entity.repository.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/entity/entity.repository.ts)
Data access: createEntity, findEntitiesByWorkspace, findEntityById.

#### [NEW] [entity.service.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/entity/entity.service.ts)
Business logic: create entity with workspace scope validation.

#### [NEW] [entity.controller.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/entity/entity.controller.ts)
Request handlers: POST /entities, GET /entities.

#### [NEW] [entity.routes.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/entity/entity.routes.ts)
Route definitions with authentication and RBAC.

---

### Phase 5: Document Type Configuration (HLR0011-0013)

#### [NEW] [documentType.model.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/document-type/documentType.model.ts)
Mongoose schema for DocumentType with hasMetadata and hasExpiry flags.

#### [NEW] [documentTypeField.model.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/document-type/documentTypeField.model.ts)
Mongoose schema for DocumentTypeField with fieldKey, fieldType (text/date), isRequired, isExpiryField.

#### [NEW] [documentType.repository.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/document-type/documentType.repository.ts)
Data access: createDocumentType, createDocumentTypeFields, getDocumentType.

#### [NEW] [documentType.service.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/document-type/documentType.service.ts)
Business logic: define document type with fields, validate configuration.

#### [NEW] [documentType.controller.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/document-type/documentType.controller.ts)
Request handlers: POST /document-types, GET /document-types.

#### [NEW] [documentType.routes.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/document-type/documentType.routes.ts)
Route definitions (OWNER/ADMIN only).

---

### Phase 6: Document Management (HLR0014-0020)

#### [NEW] [document.model.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/document/document.model.ts)
Mongoose schema for Document with documentTypeId, entityId (optional), fileUrl, and virtuals for expiry status.

#### [NEW] [documentMetadata.model.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/document/documentMetadata.model.ts)
Mongoose schema for DocumentMetadata with documentId, fieldKey, fieldValue.

#### [NEW] [document.repository.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/document/document.repository.ts)
Data access: createDocument, createMetadata, getDocuments with aggregation for expiry.

#### [NEW] [document.service.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/document/document.service.ts)
Business logic: 
- Upload validation (check required fields)
- File storage
- Expiry calculation (dynamic, no cron)
- Metadata validation against document type

#### [NEW] [document.controller.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/document/document.controller.ts)
Request handlers: POST /documents (with file upload), GET /documents (with expiry status).

#### [NEW] [document.routes.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/document/document.routes.ts)
Route definitions with file upload middleware.

---

### Phase 7: Work Item Management (HLR0021-0025)

#### [NEW] [workItemType.model.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/work-item-type/workItemType.model.ts)
Mongoose schema for WorkItemType with workspace reference.

#### [NEW] [workItemType.repository.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/work-item-type/workItemType.repository.ts)
Data access: createWorkItemType, getWorkItemTypes.

#### [NEW] [workItemType.service.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/work-item-type/workItemType.service.ts)
Business logic: define work item types.

#### [NEW] [workItemType.controller.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/work-item-type/workItemType.controller.ts)
Request handlers: POST /work-item-types, GET /work-item-types.

#### [NEW] [workItemType.routes.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/work-item-type/workItemType.routes.ts)
Route definitions (OWNER/ADMIN only).

---

#### [NEW] [workItem.model.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/work-item/workItem.model.ts)
Mongoose schema for WorkItem with status enum (DRAFT, ACTIVE, COMPLETED), entityId, ownerUserId.

#### [NEW] [workItemDocument.model.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/work-item/workItemDocument.model.ts)
Mongoose schema for WorkItemDocument junction table.

#### [NEW] [workItem.repository.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/work-item/workItem.repository.ts)
Data access: createWorkItem, updateStatus, linkDocument, getWorkItems.

#### [NEW] [workItem.service.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/work-item/workItem.service.ts)
Business logic: 
- Create work item with entity/owner validation
- Status lifecycle transitions
- Document linking

#### [NEW] [workItem.controller.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/work-item/workItem.controller.ts)
Request handlers: POST /work-items, PATCH /work-items/:id/status, POST /work-items/:id/documents.

#### [NEW] [workItem.routes.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/work-item/workItem.routes.ts)
Route definitions.

---

### Phase 8: Audit Logging (HLR0026-0027)

#### [NEW] [auditLog.model.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/audit/auditLog.model.ts)
Mongoose schema for AuditLog with action, targetType, targetId, userId, workspaceId.

#### [NEW] [audit.repository.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/audit/audit.repository.ts)
Data access: createAuditLog, getAuditLogs.

#### [NEW] [audit.service.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/audit/audit.service.ts)
Business logic: log audit events.

#### [NEW] [audit.middleware.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/audit/audit.middleware.ts)
Middleware/hooks to automatically log critical actions (document upload, work item status change, entity creation).

---

### Phase 9: Overview/Dashboard (HLR0028-0029)

#### [NEW] [overview.service.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/overview/overview.service.ts)
Aggregation queries: count entities, documents, work items, expiring documents (no charts, counts only).

#### [NEW] [overview.controller.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/overview/overview.controller.ts)
Request handler: GET /overview.

#### [NEW] [overview.routes.ts](file:///home/ashwin/Projects/workspaceops-backend/src/modules/overview/overview.routes.ts)
Route definitions.

---

### Phase 10: Integration & App Updates

#### [MODIFY] [app.ts](file:///home/ashwin/Projects/workspaceops-backend/src/app.ts)
Register all module routes, apply global middleware (error handler, CORS, etc.).

---

## Key Design Decisions

### 1. MongoDB Schema Design
- Convert SQL schema to MongoDB using references (not embedded docs)
- Maintain referential integrity through application logic
- Use Mongoose virtuals for computed fields (e.g., document expiry status)
- Indexes on frequently queried fields (workspaceId, userId, etc.)

### 2. RBAC Implementation
- Role stored in `workspaceUsers` collection
- Middleware checks user role per workspace
- Permissions hardcoded per route (no dynamic permission system in MVP)

### 3. Document Expiry
- **No cron jobs** (as per requirements)
- Expiry status calculated dynamically on read
- Computed in service layer using document metadata and current date

### 4. File Upload & Storage Strategy
- Use **Multer** for file handling
- Store files in **AWS S3 bucket** (not local storage)
- Store S3 URL in database
- File upload middleware will handle S3 integration (`@aws-sdk/client-s3`)

### 5. Authentication Strategy
- **JWT tokens only** (no refresh tokens for MVP)
- Token expiry: 24 hours (configurable)
- Token contains: userId, email
- Auth middleware validates token on protected routes

### 6. Validation Strategy
- Use **Zod** for request validation (TypeScript-native, type-safe)
- Define schemas for all API inputs
- Validation middleware applied per route
- Alternative: Start with manual validation in services, add Zod later if needed

### 7. Audit Logging Strategy
- Middleware/hooks trigger audit logs
- Not every action logged - only critical ones:
  - Document upload
  - Work item status change
  - Entity creation
  - User invitation

### 8. Testing Strategy (MVP)
- **Manual testing** using REST client (Postman/VS Code REST Client)
- Test all endpoints with different user roles
- Verify RBAC enforcement manually
- Unit tests can be added post-MVP if needed

### 9. API Documentation Strategy
- Use **Swagger/OpenAPI** with auto-generation
- Libraries: `swagger-jsdoc` + `swagger-ui-express`
- JSDoc comments on routes generate interactive docs
- Accessible at `/api-docs` endpoint
- Can be added in Phase 10 (Integration & Testing)

### 10. Error Handling
- Custom error classes with HTTP status codes
- Global error handler middleware
- Consistent error response format

---

## API Endpoints Summary

### Authentication
- `POST /auth/signup` - Create user, tenant, default workspace
- `POST /auth/login` - Authenticate and get JWT token

### Workspace
- `POST /workspaces/:id/invite` - Invite user to workspace (OWNER/ADMIN)
- `GET /workspaces` - Get user's workspaces

### Entity
- `POST /entities` - Create entity
- `GET /entities` - List entities in workspace

### Document Type
- `POST /document-types` - Define document type (OWNER/ADMIN)
- `GET /document-types` - List document types

### Document
- `POST /documents` - Upload document with metadata
- `GET /documents` - List documents (with expiry status)

### Work Item Type
- `POST /work-item-types` - Define work item type (OWNER/ADMIN)
- `GET /work-item-types` - List work item types

### Work Item
- `POST /work-items` - Create work item
- `PATCH /work-items/:id/status` - Update work item status
- `POST /work-items/:id/documents` - Link document to work item
- `GET /work-items` - List work items

### Overview
- `GET /overview` - Get workspace aggregates (counts only)

---

## Non-Requirements (MVP Scope)

As per HLR0030-0034, the following are **explicitly excluded**:
- ❌ Invoicing or payments
- ❌ SLA enforcement
- ❌ Notifications or alerts
- ❌ Custom role/permission configuration
- ❌ Dashboards with analytics charts (only simple counts)

---

## Technology Stack

### Core Dependencies
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **File Upload**: Multer
- **File Storage**: AWS S3 (@aws-sdk/client-s3)
- **Validation**: Zod (type-safe validation)
- **API Documentation**: swagger-jsdoc + swagger-ui-express

### Development Dependencies
- TypeScript
- ts-node-dev
- ESLint
- Prettier
- @types/* packages

---

## Verification Plan

### Automated Testing
```bash
# Manual API testing using VS Code REST Client or Postman
# Test each endpoint with different roles
# Verify RBAC enforcement
# Test document expiry calculations
# Test work item lifecycle transitions
```

### Test Scenarios

1. **Authentication Flow**
   - Signup creates user + tenant + workspace
   - Login returns valid JWT
   - Protected routes reject invalid tokens

2. **RBAC Enforcement**
   - OWNER can invite users
   - ADMIN can invite users
   - MEMBER cannot invite users
   - VIEWER has read-only access

3. **Entity Management**
   - Create entities with different roles
   - Entities scoped to workspace

4. **Document Type & Upload**
   - Define document type with metadata fields
   - Upload document validates required fields
   - Upload enforces workspace scope

5. **Document Expiry**
   - Documents with expiry field show valid/expiring/expired status
   - Status computed dynamically (no stored state)

6. **Work Item Lifecycle**
   - Create work item in DRAFT
   - Transition to ACTIVE
   - Transition to COMPLETED
   - Invalid transitions rejected

7. **Audit Logging**
   - Critical actions create audit logs
   - Audit logs contain actor, action, target

8. **Overview Aggregation**
   - Overview returns correct counts
   - Counts filtered by workspace

---

## Next Steps

1. **Review this implementation_plan.md** - Confirm architecture and approach
2. **Set up infrastructure** - Middleware, utilities, error handling
3. **Implement modules sequentially** - Start with auth → workspace → entities → documents → work items
4. **Test incrementally** - Test each module after implementation
5. **Integrate modules** - Wire everything together in `app.ts`
6. **Final verification** - End-to-end testing of all HLRs
7. **Add Swagger documentation** - Generate API docs during final integration phase

---

## Technical Decisions Summary

Based on your requirements, here are the confirmed technical choices:

✅ **File Storage**: AWS S3 bucket integration  
✅ **Authentication**: JWT tokens only (24hr expiry)  
✅ **Validation**: Zod for type-safe request validation  
✅ **Testing**: Manual testing for MVP (unit tests post-MVP)  
✅ **API Docs**: Swagger/OpenAPI with auto-generation  

These decisions are reflected throughout the implementation plan above.
