# WorkspaceOps Backend - Clean Architecture Design

## Overview

This document defines the **true Clean Architecture** for WorkspaceOps, following Uncle Bob's principles with proper dependency inversion and separation of concerns.

---

## Core Principles

### 1. Dependency Rule
**Dependencies point INWARD only:**
```
Infrastructure → Interfaces → Application → Domain
(Framework)      (HTTP/UI)    (Use Cases)    (Business Logic)
```

### 2. Layer Independence
- **Domain**: Pure TypeScript, zero framework dependencies
- **Application**: Business rules, no HTTP/DB knowledge
- **Interfaces**: HTTP controllers, presenters (framework-aware)
- **Infrastructure**: Mongoose, Express routes, external services

### 3. Dependency Inversion
- Domain defines **interfaces** (repositories, services)
- Infrastructure provides **implementations**
- Application depends on abstractions, not concrete implementations

---

## Complete Folder Structure

```
src/
├── app.ts                          # App bootstrap
├── server.ts                       # Server entry point
├── config/
│   ├── database.ts                 # DB connection
│   └── env.ts                      # Environment
│
├── shared/                         # Shared across modules
│   ├── domain/
│   │   ├── errors/
│   │   │   ├── AppError.ts
│   │   │   ├── NotFoundError.ts
│   │   │   └── ValidationError.ts
│   │   └── types/
│   │       └── common.types.ts
│   │
│   ├── application/
│   │   └── dto/
│   │       └── PaginationDTO.ts
│   │
│   ├── interfaces/
│   │   ├── http/
│   │   │   └── ResponseFormatter.ts
│   │   └── middleware/
│   │       ├── errorHandler.ts
│   │       ├── authMiddleware.ts
│   │       └── rbacMiddleware.ts
│   │
│   └── infrastructure/
│       ├── logger/
│       │   └── Logger.ts
│       └── s3/
│           └── S3Client.ts
│
└── modules/
    │
    ├── auth/
    │   ├── domain/
    │   │   ├── entities/
    │   │   │   └── User.ts                    # Plain TS class
    │   │   ├── repositories/
    │   │   │   └── IUserRepository.ts         # Interface
    │   │   └── value-objects/
    │   │       └── Email.ts                   # Value object
    │   │
    │   ├── application/
    │   │   ├── use-cases/
    │   │   │   ├── SignupUser.ts              # Signup use case
    │   │   │   └── LoginUser.ts               # Login use case
    │   │   ├── dto/
    │   │   │   ├── SignupDTO.ts
    │   │   │   └── LoginDTO.ts
    │   │   └── services/
    │   │       └── ITokenService.ts           # Interface
    │   │
    │   ├── interfaces/
    │   │   ├── http/
    │   │   │   └── AuthController.ts          # Express handlers
    │   │   └── presenters/
    │   │       └── UserPresenter.ts           # Response formatting
    │   │
    │   └── infrastructure/
    │       ├── mongoose/
    │       │   ├── UserModel.ts               # Mongoose schema
    │       │   └── UserRepositoryImpl.ts      # Implements IUserRepository
    │       ├── jwt/
    │       │   └── TokenServiceImpl.ts        # Implements ITokenService
    │       └── routes/
    │           └── auth.routes.ts             # Express routes
    │
    ├── workspace/
    │   ├── domain/
    │   │   ├── entities/
    │   │   │   ├── Tenant.ts
    │   │   │   ├── Workspace.ts
    │   │   │   └── WorkspaceUser.ts
    │   │   ├── repositories/
    │   │   │   ├── ITenantRepository.ts
    │   │   │   ├── IWorkspaceRepository.ts
    │   │   │   └── IWorkspaceUserRepository.ts
    │   │   └── enums/
    │   │       └── WorkspaceRole.ts           # OWNER, ADMIN, etc.
    │   │
    │   ├── application/
    │   │   ├── use-cases/
    │   │   │   ├── CreateWorkspace.ts
    │   │   │   ├── InviteUserToWorkspace.ts
    │   │   │   └── GetUserWorkspaces.ts
    │   │   └── dto/
    │   │       ├── CreateWorkspaceDTO.ts
    │   │       └── InviteUserDTO.ts
    │   │
    │   ├── interfaces/
    │   │   ├── http/
    │   │   │   └── WorkspaceController.ts
    │   │   └── presenters/
    │   │       └── WorkspacePresenter.ts
    │   │
    │   └── infrastructure/
    │       ├── mongoose/
    │       │   ├── TenantModel.ts
    │       │   ├── WorkspaceModel.ts
    │       │   ├── WorkspaceUserModel.ts
    │       │   ├── TenantRepositoryImpl.ts
    │       │   ├── WorkspaceRepositoryImpl.ts
    │       │   └── WorkspaceUserRepositoryImpl.ts
    │       └── routes/
    │           └── workspace.routes.ts
    │
    ├── entity/
    │   ├── domain/
    │   │   ├── entities/
    │   │   │   └── Entity.ts
    │   │   ├── repositories/
    │   │   │   └── IEntityRepository.ts
    │   │   └── enums/
    │   │       └── EntityRole.ts              # SELF, CUSTOMER, etc.
    │   │
    │   ├── application/
    │   │   ├── use-cases/
    │   │   │   ├── CreateEntity.ts
    │   │   │   └── ListEntities.ts
    │   │   └── dto/
    │   │       └── CreateEntityDTO.ts
    │   │
    │   ├── interfaces/
    │   │   ├── http/
    │   │   │   └── EntityController.ts
    │   │   └── presenters/
    │   │       └── EntityPresenter.ts
    │   │
    │   └── infrastructure/
    │       ├── mongoose/
    │       │   ├── EntityModel.ts
    │       │   └── EntityRepositoryImpl.ts
    │       └── routes/
    │           └── entity.routes.ts
    │
    ├── document-type/
    │   ├── domain/
    │   │   ├── entities/
    │   │   │   ├── DocumentType.ts
    │   │   │   └── DocumentTypeField.ts
    │   │   ├── repositories/
    │   │   │   └── IDocumentTypeRepository.ts
    │   │   └── enums/
    │   │       └── FieldType.ts               # text, date
    │   │
    │   ├── application/
    │   │   ├── use-cases/
    │   │   │   ├── DefineDocumentType.ts
    │   │   │   └── GetDocumentTypes.ts
    │   │   └── dto/
    │   │       └── DefineDocumentTypeDTO.ts
    │   │
    │   ├── interfaces/
    │   │   ├── http/
    │   │   │   └── DocumentTypeController.ts
    │   │   └── presenters/
    │   │       └── DocumentTypePresenter.ts
    │   │
    │   └── infrastructure/
    │       ├── mongoose/
    │       │   ├── DocumentTypeModel.ts
    │       │   ├── DocumentTypeFieldModel.ts
    │       │   └── DocumentTypeRepositoryImpl.ts
    │       └── routes/
    │           └── documentType.routes.ts
    │
    ├── document/
    │   ├── domain/
    │   │   ├── entities/
    │   │   │   ├── Document.ts
    │   │   │   └── DocumentMetadata.ts
    │   │   ├── repositories/
    │   │   │   └── IDocumentRepository.ts
    │   │   ├── services/
    │   │   │   └── IFileStorage.ts            # Interface
    │   │   └── value-objects/
    │   │       └── ExpiryStatus.ts
    │   │
    │   ├── application/
    │   │   ├── use-cases/
    │   │   │   ├── UploadDocument.ts
    │   │   │   ├── ListDocuments.ts
    │   │   │   └── CalculateExpiry.ts
    │   │   └── dto/
    │   │       └── UploadDocumentDTO.ts
    │   │
    │   ├── interfaces/
    │   │   ├── http/
    │   │   │   └── DocumentController.ts
    │   │   └── presenters/
    │   │       └── DocumentPresenter.ts
    │   │
    │   └── infrastructure/
    │       ├── mongoose/
    │       │   ├── DocumentModel.ts
    │       │   ├── DocumentMetadataModel.ts
    │       │   └── DocumentRepositoryImpl.ts
    │       ├── s3/
    │       │   └── S3FileStorage.ts           # Implements IFileStorage
    │       └── routes/
    │           └── document.routes.ts
    │
    ├── work-item-type/
    │   ├── domain/
    │   │   ├── entities/
    │   │   │   └── WorkItemType.ts
    │   │   └── repositories/
    │   │       └── IWorkItemTypeRepository.ts
    │   │
    │   ├── application/
    │   │   ├── use-cases/
    │   │   │   ├── DefineWorkItemType.ts
    │   │   │   └── GetWorkItemTypes.ts
    │   │   └── dto/
    │   │       └── DefineWorkItemTypeDTO.ts
    │   │
    │   ├── interfaces/
    │   │   ├── http/
    │   │   │   └── WorkItemTypeController.ts
    │   │   └── presenters/
    │   │       └── WorkItemTypePresenter.ts
    │   │
    │   └── infrastructure/
    │       ├── mongoose/
    │       │   ├── WorkItemTypeModel.ts
    │       │   └── WorkItemTypeRepositoryImpl.ts
    │       └── routes/
    │           └── workItemType.routes.ts
    │
    ├── work-item/
    │   ├── domain/
    │   │   ├── entities/
    │   │   │   ├── WorkItem.ts
    │   │   │   └── WorkItemDocument.ts
    │   │   ├── repositories/
    │   │   │   └── IWorkItemRepository.ts
    │   │   └── enums/
    │   │       └── WorkItemStatus.ts          # DRAFT, ACTIVE, COMPLETED
    │   │
    │   ├── application/
    │   │   ├── use-cases/
    │   │   │   ├── CreateWorkItem.ts
    │   │   │   ├── UpdateWorkItemStatus.ts
    │   │   │   └── LinkDocumentToWorkItem.ts
    │   │   └── dto/
    │   │       ├── CreateWorkItemDTO.ts
    │   │       └── UpdateStatusDTO.ts
    │   │
    │   ├── interfaces/
    │   │   ├── http/
    │   │   │   └── WorkItemController.ts
    │   │   └── presenters/
    │   │       └── WorkItemPresenter.ts
    │   │
    │   └── infrastructure/
    │       ├── mongoose/
    │       │   ├── WorkItemModel.ts
    │       │   ├── WorkItemDocumentModel.ts
    │       │   └── WorkItemRepositoryImpl.ts
    │       └── routes/
    │           └── workItem.routes.ts
    │
    ├── audit/
    │   ├── domain/
    │   │   ├── entities/
    │   │   │   └── AuditLog.ts
    │   │   └── repositories/
    │   │       └── IAuditRepository.ts
    │   │
    │   ├── application/
    │   │   ├── use-cases/
    │   │   │   └── RecordAudit.ts
    │   │   └── dto/
    │   │       └── AuditEventDTO.ts
    │   │
    │   ├── interfaces/
    │   │   └── middleware/
    │   │       └── auditMiddleware.ts
    │   │
    │   └── infrastructure/
    │       └── mongoose/
    │           ├── AuditLogModel.ts
    │           └── AuditRepositoryImpl.ts
    │
    └── overview/
        ├── application/
        │   ├── use-cases/
        │   │   └── GetOverview.ts
        │   └── dto/
        │       └── OverviewDTO.ts
        │
        ├── interfaces/
        │   ├── http/
        │   │   └── OverviewController.ts
        │   └── presenters/
        │       └── OverviewPresenter.ts
        │
        └── infrastructure/
            └── routes/
                └── overview.routes.ts
```

---

## Layer Responsibilities

### 1. Domain Layer (Core Business Logic)

**Purpose**: Pure business logic, framework-agnostic

**Contains**:
- **Entities**: Business objects with identity (e.g., `User`, `Workspace`)
- **Value Objects**: Immutable values (e.g., `Email`, `ExpiryStatus`)
- **Repository Interfaces**: Data access contracts
- **Service Interfaces**: External service contracts
- **Enums**: Business enumerations
- **Domain Errors**: Business rule violations

**Rules**:
- ✅ Pure TypeScript classes
- ✅ No framework imports (no Mongoose, Express, etc.)
- ✅ No external dependencies
- ✅ Contains business validation logic
- ❌ No database concerns
- ❌ No HTTP concerns

**Example Entity**:
```typescript
// modules/auth/domain/entities/User.ts
export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly passwordHash: string,
    public readonly name?: string,
    public readonly createdAt?: Date
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.email || !this.email.includes('@')) {
      throw new ValidationError('Invalid email');
    }
  }

  updateName(newName: string): User {
    return new User(
      this.id,
      this.email,
      this.passwordHash,
      newName,
      this.createdAt
    );
  }
}
```

**Example Repository Interface**:
```typescript
// modules/auth/domain/repositories/IUserRepository.ts
import { User } from '../entities/User';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
}
```

---

### 2. Application Layer (Use Cases)

**Purpose**: Orchestrate business logic, coordinate domain objects

**Contains**:
- **Use Cases**: Application-specific business rules
- **DTOs**: Data transfer objects for input/output
- **Service Interfaces**: Application services

**Rules**:
- ✅ Depends on domain layer
- ✅ Uses repository and service interfaces
- ✅ Contains application workflows
- ❌ No framework dependencies
- ❌ No HTTP/database knowledge
- ❌ No UI logic

**Example Use Case**:
```typescript
// modules/auth/application/use-cases/SignupUser.ts
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { ITenantRepository } from '../../../workspace/domain/repositories/ITenantRepository';
import { IWorkspaceRepository } from '../../../workspace/domain/repositories/IWorkspaceRepository';
import { ITokenService } from '../services/ITokenService';
import { User } from '../../domain/entities/User';
import { SignupDTO } from '../dto/SignupDTO';
import { AppError } from '../../../../shared/domain/errors/AppError';

export class SignupUser {
  constructor(
    private userRepo: IUserRepository,
    private tenantRepo: ITenantRepository,
    private workspaceRepo: IWorkspaceRepository,
    private tokenService: ITokenService
  ) {}

  async execute(dto: SignupDTO): Promise<{ userId: string; token: string }> {
    // Check if user exists
    const existingUser = await this.userRepo.findByEmail(dto.email);
    if (existingUser) {
      throw new AppError('User already exists', 400);
    }

    // Hash password (via service)
    const passwordHash = await this.tokenService.hashPassword(dto.password);

    // Create user
    const user = new User(
      '', // ID will be generated by repo
      dto.email,
      passwordHash,
      dto.name
    );
    const savedUser = await this.userRepo.save(user);

    // Create tenant
    const tenant = await this.tenantRepo.create({
      name: `${dto.email}'s Tenant`
    });

    // Create workspace
    const workspace = await this.workspaceRepo.create({
      tenantId: tenant.id,
      name: 'Default Workspace'
    });

    // Assign OWNER role
    await this.workspaceRepo.addUser(workspace.id, savedUser.id, 'OWNER');

    // Generate token
    const token = this.tokenService.generateToken(savedUser.id);

    return { userId: savedUser.id, token };
  }
}
```

**Example DTO**:
```typescript
// modules/auth/application/dto/SignupDTO.ts
export interface SignupDTO {
  email: string;
  password: string;
  name?: string;
}
```

---

### 3. Interfaces Layer (Controllers & Presenters)

**Purpose**: Adapt external requests to application layer

**Contains**:
- **HTTP Controllers**: Express route handlers
- **Presenters**: Format responses
- **Middleware**: Request processing
- **Validation**: Input validation (Zod schemas)

**Rules**:
- ✅ Framework-aware (Express, etc.)
- ✅ Calls use cases
- ✅ Transforms HTTP → DTO → Use Case
- ✅ Formats responses via presenters
- ❌ No business logic
- ❌ No database access

**Example Controller**:
```typescript
// modules/auth/interfaces/http/AuthController.ts
import { Request, Response, NextFunction } from 'express';
import { SignupUser } from '../../application/use-cases/SignupUser';
import { UserPresenter } from '../presenters/UserPresenter';

export class AuthController {
  constructor(
    private signupUseCase: SignupUser,
    private presenter: UserPresenter
  ) {}

  async signup(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.signupUseCase.execute(req.body);
      res.status(201).json(this.presenter.toAuthResponse(result));
    } catch (error) {
      next(error);
    }
  }
}
```

**Example Presenter**:
```typescript
// modules/auth/interfaces/presenters/UserPresenter.ts
export class UserPresenter {
  toAuthResponse(data: { userId: string; token: string }) {
    return {
      success: true,
      data: {
        userId: data.userId,
        token: data.token
      }
    };
  }
}
```

---

### 4. Infrastructure Layer (Implementations)

**Purpose**: Concrete implementations of interfaces, framework code

**Contains**:
- **Mongoose Models**: Database schemas
- **Repository Implementations**: Implement domain repository interfaces
- **Service Implementations**: Token generation, S3 upload, etc.
- **Routes**: Express route registration

**Rules**:
- ✅ Implements domain/application interfaces
- ✅ Framework-specific code (Mongoose, AWS SDK, etc.)
- ✅ Adapts external libraries to domain
- ❌ No business logic
- ❌ No direct use case orchestration

**Example Repository Implementation**:
```typescript
// modules/auth/infrastructure/mongoose/UserRepositoryImpl.ts
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { UserModel } from './UserModel';

export class UserRepositoryImpl implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const doc = await UserModel.findById(id);
    if (!doc) return null;
    
    return new User(
      doc._id.toString(),
      doc.email,
      doc.passwordHash,
      doc.name,
      doc.createdAt
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email });
    if (!doc) return null;
    
    return new User(
      doc._id.toString(),
      doc.email,
      doc.passwordHash,
      doc.name,
      doc.createdAt
    );
  }

  async save(user: User): Promise<User> {
    const doc = await UserModel.create({
      email: user.email,
      passwordHash: user.passwordHash,
      name: user.name
    });

    return new User(
      doc._id.toString(),
      doc.email,
      doc.passwordHash,
      doc.name,
      doc.createdAt
    );
  }

  async delete(id: string): Promise<void> {
    await UserModel.findByIdAndDelete(id);
  }
}
```

**Example Mongoose Model**:
```typescript
// modules/auth/infrastructure/mongoose/UserModel.ts
import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String }
  },
  { timestamps: true }
);

export const UserModel = model('User', userSchema);
```

**Example Routes**:
```typescript
// modules/auth/infrastructure/routes/auth.routes.ts
import { Router } from 'express';
import { AuthController } from '../../interfaces/http/AuthController';
import { SignupUser } from '../../application/use-cases/SignupUser';
import { UserRepositoryImpl } from '../mongoose/UserRepositoryImpl';
import { TokenServiceImpl } from '../jwt/TokenServiceImpl';
import { UserPresenter } from '../../interfaces/presenters/UserPresenter';

const router = Router();

// Dependency injection (manual for now)
const userRepo = new UserRepositoryImpl();
const tokenService = new TokenServiceImpl();
const signupUseCase = new SignupUser(userRepo, /* other deps */);
const presenter = new UserPresenter();
const controller = new AuthController(signupUseCase, presenter);

router.post('/signup', (req, res, next) => controller.signup(req, res, next));

export default router;
```

---

## Dependency Injection Strategy

For MVP, use **manual dependency injection** in route files:

```typescript
// Infrastructure layer creates all dependencies
const repo = new UserRepositoryImpl();
const service = new TokenServiceImpl();
const useCase = new SignupUser(repo, service);
const controller = new AuthController(useCase);
```

**Post-MVP**: Consider using `tsyringe` or `InversifyJS` for automatic DI.

---

## Migration Strategy (Current Code → Clean Architecture)

### Step 1: Keep Current Code Running
Don't break existing signup flow while migrating.

### Step 2: Create New Structure Alongside
1. Create `domain/`, `application/`, `interfaces/`, `infrastructure/` folders
2. Implement one feature at a time in new structure
3. Gradually migrate endpoints

### Step 3: Migration Order
1. **Auth module first** (signup already works)
   - Extract domain entity from current code
   - Create repository interface
   - Move service logic to use case
   - Implement repository
   - Wire up controller
2. **Workspace module**
3. **Remaining modules**

### Step 4: Delete Old Code
Once all features migrated and tested, remove old structure.

---

## Testing Strategy

### Domain Layer Tests
- Unit tests for entities and value objects
- No mocks needed (pure logic)

### Application Layer Tests
- Unit tests for use cases
- Mock repositories and services

### Interface Layer Tests
- Integration tests for controllers
- Mock use cases

### Infrastructure Layer Tests
- Integration tests with real database
- Test repository implementations

---

## Benefits of This Architecture

1. **Framework Independence**: Swap Express for Fastify, Mongoose for TypeORM
2. **Testability**: Domain/application layers easily unit tested
3. **Business Logic Protection**: Core logic isolated from external changes
4. **Scalability**: Clear boundaries make it easy to add features
5. **Team Collaboration**: Different teams can work on different layers

---

## Next Steps

1. Review and approve this architecture
2. Decide on migration strategy (gradual vs. rewrite)
3. Start with auth module migration
4. Update implementation_plan.md with new structure
5. Create detailed examples for each layer

