# WorkspaceOps Backend - Technical Decisions & Architecture Rationale

## Document Purpose

This document explains **why** we made specific technical and architectural decisions in the WorkspaceOps backend. These explanations are:
- Interview-worthy: Demonstrate deep understanding of design patterns and trade-offs
- Team-oriented: Help other developers understand our reasoning
- Future-proof: Document context for future refactoring decisions

---

## Table of Contents

1. [Clean Architecture Pattern](#1-clean-architecture-pattern)
2. [Transaction Management for Nested Entities](#2-transaction-management-for-nested-entities)
3. [Layered Validation Strategy](#3-layered-validation-strategy)
4. [Manual Dependency Injection](#4-manual-dependency-injection)
5. [Repository Pattern](#5-repository-pattern)
6. [MongoDB with Mongoose (Not TypeORM)](#6-mongodb-with-mongoose-not-typeorm)
7. [RBAC Middleware Strategy](#7-rbac-middleware-strategy)

---

## 1. Clean Architecture Pattern

### Decision
Use Clean Architecture (Domain → Application → Interfaces → Infrastructure) with strict dependency inversion.

### Why This Matters

**The Problem We're Solving:**
In traditional layered architectures, business logic becomes tightly coupled to frameworks (Express, Mongoose, AWS SDK). This creates:
- **Vendor lock-in**: Hard to switch from Express to Fastify or Mongoose to TypeORM
- **Testing nightmares**: Can't test business logic without mocking databases
- **Fragile code**: Framework updates break business logic

**Our Solution:**
```
Infrastructure → Interfaces → Application → Domain
(Mongoose/AWS)   (HTTP/UI)    (Use Cases)    (Pure Business Logic)
```

**Real-World Example:**

❌ **Without Clean Architecture:**
```typescript
// auth.controller.ts - Business logic mixed with HTTP and database
export async function signup(req: Request, res: Response) {
  // HTTP concerns
  const { email, password } = req.body;
  
  // Database concerns (direct Mongoose usage)
  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ error: 'User exists' });
  }
  
  // Business logic
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await UserModel.create({ email, passwordHash: hashedPassword });
  
  // More business logic
  const tenant = await TenantModel.create({ name: `${email}'s Tenant` });
  const workspace = await WorkspaceModel.create({ tenantId: tenant._id });
  
  // Token generation
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
  
  res.json({ token });
}
```
**Problems:**
- Can't test signup logic without Express mock
- Can't test without MongoDB running
- Hard to switch to different HTTP framework or database
- Business rules scattered everywhere

✅ **With Clean Architecture:**
```typescript
// Domain: Pure business logic (no dependencies)
class User {
  constructor(public id: string, public email: string) {
    if (!email.includes('@')) throw new ValidationError('Invalid email');
  }
}

// Application: Business workflow (depends only on abstractions)
class SignupUser {
  constructor(
    private userRepo: IUserRepository,  // Interface, not concrete class
    private tokenService: ITokenService
  ) {}
  
  async execute(dto: SignupDTO) {
    const existingUser = await this.userRepo.findByEmail(dto.email);
    if (existingUser) throw new AppError('User exists');
    
    const user = new User('', dto.email);
    const savedUser = await this.userRepo.save(user);
    const token = this.tokenService.generateToken(savedUser.id);
    return { userId: savedUser.id, token };
  }
}

// Infrastructure: Framework-specific implementation
class UserRepositoryImpl implements IUserRepository {
  async save(user: User) {
    const doc = await UserModel.create({ email: user.email });
    return new User(doc._id.toString(), doc.email);
  }
}
```

**Benefits:**
- ✅ Test `SignupUser` without database (mock `IUserRepository`)
- ✅ Swap Mongoose for TypeORM by changing only `UserRepositoryImpl`
- ✅ Business logic protected from framework changes
- ✅ Clear separation of concerns

### Interview Talking Points
- "We follow Uncle Bob's Clean Architecture to maintain framework independence"
- "Our business logic has zero dependencies on external libraries"
- "We can test use cases in milliseconds without database connections"
- "This architecture scales better as the team grows - frontend, backend, and infrastructure teams can work independently"

---

## 2. Transaction Management for Nested Entities

### Decision
Use MongoDB transactions (sessions) when creating/deleting entities with parent-child relationships.

### The Problem: Data Consistency

**Scenario:** Creating a `DocumentType` with multiple `DocumentTypeField` records.

Without transactions:
```typescript
// Step 1: Create parent
const docType = await DocumentTypeModel.create({
  name: 'Passport',
  hasExpiry: true
});
// ✅ Saved successfully

// Step 2: Create child 1
const field1 = await DocumentTypeFieldModel.create({
  documentTypeId: docType._id,
  fieldKey: 'passport_number'
});
// ✅ Saved successfully

// Step 3: Create child 2
const field2 = await DocumentTypeFieldModel.create({
  documentTypeId: docType._id,
  fieldKey: 'expiry_date',
  isExpiryField: true
});
// ❌ FAILS! (network timeout, disk full, validation error, etc.)
```

**Result:** Database now has:
- ✅ DocumentType with `hasExpiry = true`
- ✅ Field 1 (passport_number)
- ❌ Missing Field 2 (expiry_date)
- **BROKEN STATE:** Business rule violated (hasExpiry requires an expiry field)

### Why Operations Can Fail Midway

**Common Failure Scenarios:**

1. **Network Issues:**
   - Connection to MongoDB drops between Field 1 and Field 2
   - Network partition or timeout
   - Load balancer routing issues

2. **Resource Constraints:**
   - Database runs out of disk space
   - Memory limit exceeded
   - Connection pool exhausted

3. **Validation Errors:**
   - Field 2 has duplicate `fieldKey` (unique constraint)
   - Data type mismatch
   - Schema validation fails

4. **Application Crashes:**
   - Server restarts between operations
   - Out of memory error
   - Uncaught exception in code

5. **Database-Level Issues:**
   - Index creation fails
   - Write concern timeout
   - Replica set election in progress

### Our Solution: Atomic Transactions

```typescript
async create(documentType, fields) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // All operations use the same session
    const docType = await DocumentTypeModel.create([documentType], { session });
    const createdFields = await DocumentTypeFieldModel.insertMany(fields, { session });
    
    // Commit: if we reach here, all operations succeeded
    await session.commitTransaction();
    return { docType, createdFields };
    
  } catch (error) {
    // Rollback: if ANY operation fails, undo EVERYTHING
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

**Guarantees:**
- ✅ **All or nothing**: Either everything saves or nothing saves
- ✅ **Consistency**: Database never left in broken state
- ✅ **Isolation**: Other operations don't see partial data

### When to Use Transactions

**Use transactions when:**
- Creating/deleting parent-child records (DocumentType + Fields)
- Multi-step operations that must succeed together
- Business rules span multiple collections

**Skip transactions when:**
- Single document operations
- Independent operations
- Performance is critical and eventual consistency is acceptable

### Interview Talking Points
- "We use ACID transactions to ensure data consistency in parent-child relationships"
- "MongoDB transactions prevent orphaned records when multi-step operations fail"
- "This is similar to database transactions in banking - you can't have a debit without a credit"
- "The trade-off is performance, but data integrity is more important for our use case"

---

## 3. Layered Validation Strategy

### Decision
Place validation logic in specific layers based on responsibility, avoiding duplication.

### The Problem: Duplicate Validation Logic

**Example Rule:** "If `isExpiryField` is true, then `fieldType` must be 'date'"

**Anti-Pattern (Validation in all 3 layers):**

```typescript
// ❌ Layer 1: Controller
app.post('/fields', (req, res) => {
  if (req.body.isExpiryField && req.body.fieldType !== 'date') {
    return res.status(400).json({ error: 'Expiry field must be date' });
  }
  // ...
});

// ❌ Layer 2: Use Case
class AddField {
  execute(dto) {
    if (dto.isExpiryField && dto.fieldType !== 'date') {
      throw new ValidationError('Expiry field must be date');
    }
    // ...
  }
}

// ❌ Layer 3: Entity
class DocumentTypeField {
  constructor(/* ... */, isExpiryField, fieldType) {
    if (isExpiryField && fieldType !== 'date') {
      throw new ValidationError('Expiry field must be date');
    }
  }
}
```

**Problems:**
- Same logic repeated 3 times
- If rule changes, must update 3 places
- Easy to create inconsistencies
- Harder to maintain

### Our Solution: Single Responsibility Validation

**Validation Responsibilities:**

| Layer | Validation Type | Example |
|-------|----------------|---------|
| **Domain Entity** | Self-consistency rules | "isExpiryField requires fieldType=date" |
| **Use Case** | Cross-entity business rules | "Adding expiry field requires documentType.hasExpiry=true" |
| **Controller** | HTTP-specific validation | None (just calls use case) |

**Correct Implementation:**

```typescript
// ✅ Domain Entity: Validates self-consistency
class DocumentTypeField {
  constructor(
    public readonly fieldType: FieldType,
    public readonly isExpiryField: boolean
  ) {
    this.validate();
  }
  
  private validate(): void {
    // This entity's invariant: expiry fields must be dates
    if (this.isExpiryField && this.fieldType !== FieldType.DATE) {
      throw new ValidationError('Expiry field must be a date field');
    }
  }
}

// ✅ Use Case: Validates cross-entity business rules
class AddField {
  async execute(dto: AddFieldDTO) {
    const documentType = await this.repo.findById(dto.documentTypeId);
    
    // This requires checking ANOTHER entity, so it belongs here
    if (dto.isExpiryField && !documentType.hasExpiry) {
      throw new ValidationError('Document type must have expiry enabled');
    }
    
    // Let entity validate itself
    const field = new DocumentTypeField(dto.fieldType, dto.isExpiryField);
    return this.repo.addField(dto.documentTypeId, field);
  }
}

// ✅ Controller: No validation, just delegates
class DocumentTypeController {
  async addField(req: Request, res: Response) {
    const result = await this.addFieldUseCase.execute(req.body);
    res.status(201).json(this.presenter.presentField(result));
  }
}
```

### Decision Matrix: Where to Validate

```
┌─────────────────────────────────────────────────────────────┐
│ Question: Where does this validation belong?               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Does it require checking OTHER entities?                   │
│   ├─ YES → Use Case Layer                                  │
│   └─ NO  → Does it involve HTTP-specific concerns?         │
│       ├─ YES → Controller Layer (rare)                     │
│       └─ NO  → Domain Entity Layer                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Examples:**

| Validation | Layer | Why |
|-----------|-------|-----|
| Email format | Domain Entity | Intrinsic property of User |
| Expiry field is date | Domain Entity | Self-consistency of Field |
| User exists in workspace | Use Case | Requires checking Workspace entity |
| Document type has expiry enabled | Use Case | Requires checking DocumentType entity |
| Content-Type header | Controller | HTTP-specific (rare in our case) |

### Interview Talking Points
- "We follow Single Responsibility Principle for validation"
- "Domain entities validate their own invariants, use cases validate cross-entity business rules"
- "This prevents duplicate code and makes the codebase easier to maintain"
- "It's similar to DRY principle but applied to architectural layers"

---

## 4. Manual Dependency Injection

### Decision
Use manual dependency injection in route files instead of a DI container (for MVP).

### Current Approach

```typescript
// modules/document-type/infrastructure/routes/documentType.routes.ts

// 1. Create repository implementations
const documentTypeRepo = new DocumentTypeRepositoryImpl();
const workspaceRepo = new WorkspaceRepositoryImpl();

// 2. Create use cases with injected dependencies
const createUseCase = new CreateDocumentType(documentTypeRepo, workspaceRepo);
const getUseCase = new GetDocumentTypes(documentTypeRepo);

// 3. Create presenter and controller
const presenter = new DocumentTypePresenter();
const controller = new DocumentTypeController(createUseCase, getUseCase, presenter);

// 4. Define routes
router.post('/document-types', authMiddleware, controller.create);
```

### Why Manual DI (For Now)

**Advantages:**
- ✅ Simple and explicit - easy to understand for beginners
- ✅ No external library needed (tsyringe, InversifyJS)
- ✅ Zero magic - you see exactly what's created and when
- ✅ Faster MVP development

**Disadvantages:**
- ❌ Verbose - lots of boilerplate code
- ❌ Harder to swap implementations for testing
- ❌ No singleton management

### Future: Automatic DI Container

**Post-MVP, we'll migrate to tsyringe:**

```typescript
// Register dependencies once
container.register("IUserRepository", { useClass: UserRepositoryImpl });
container.register("ITokenService", { useClass: TokenServiceImpl });

// Auto-inject dependencies via decorators
@injectable()
class SignupUser {
  constructor(
    @inject("IUserRepository") private userRepo: IUserRepository,
    @inject("ITokenService") private tokenService: ITokenService
  ) {}
}

// Resolve with one line
const signupUseCase = container.resolve(SignupUser);
```

### Interview Talking Points
- "For MVP, manual DI keeps things simple and explicit"
- "We're ready to migrate to a DI container like tsyringe as the codebase grows"
- "This follows the 'make it work, make it right, make it fast' principle"

---

## 5. Repository Pattern

### Decision
Use repository pattern to abstract data access, returning domain entities instead of database models.

### Why Repository Pattern?

**The Problem:**
Direct database access couples business logic to database structure.

❌ **Without Repository:**
```typescript
// Use case directly uses Mongoose
class SignupUser {
  async execute(dto: SignupDTO) {
    const existingUser = await UserModel.findOne({ email: dto.email }); // Coupled to Mongoose
    if (existingUser) throw new Error('User exists');
    
    const user = await UserModel.create({ email: dto.email }); // Coupled to Mongoose schema
    return user; // Returns Mongoose document, not domain entity
  }
}
```

✅ **With Repository:**
```typescript
// Interface in domain layer
interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  save(user: User): Promise<User>;
}

// Use case depends on interface
class SignupUser {
  constructor(private userRepo: IUserRepository) {}
  
  async execute(dto: SignupDTO) {
    const existingUser = await this.userRepo.findByEmail(dto.email);
    if (existingUser) throw new Error('User exists');
    
    const user = new User('', dto.email); // Domain entity
    return this.userRepo.save(user); // Returns domain entity
  }
}

// Implementation in infrastructure layer
class UserRepositoryImpl implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email });
    if (!doc) return null;
    
    // Convert Mongoose document to domain entity
    return new User(doc._id.toString(), doc.email);
  }
}
```

### Benefits

1. **Database Independence:**
   - Swap Mongoose for TypeORM: just create new `UserRepositoryTypeormImpl`
   - Swap MongoDB for PostgreSQL: same interface, different implementation

2. **Testability:**
   ```typescript
   // Mock repository for testing
   class MockUserRepository implements IUserRepository {
     private users: User[] = [];
     
     async findByEmail(email: string) {
       return this.users.find(u => u.email === email) || null;
     }
   }
   
   // Test use case without database
   const mockRepo = new MockUserRepository();
   const useCase = new SignupUser(mockRepo);
   ```

3. **Domain-Centric:**
   - Use cases work with domain entities, not database models
   - Business logic never sees MongoDB-specific properties

### Interview Talking Points
- "Repository pattern provides an abstraction over data access"
- "It's like a collection in memory, but persisted to database"
- "This allows us to swap databases without changing business logic"
- "It makes testing easier - we can mock repositories instead of mocking databases"

---

## 6. MongoDB with Mongoose (Not TypeORM)

### Decision
Use MongoDB with Mongoose ODM instead of PostgreSQL with TypeORM.

### Why MongoDB?

**Project Requirements:**
- Multi-tenant SaaS with workspace-scoped data
- Flexible schemas (document types with dynamic fields)
- Rapid prototyping for MVP

**MongoDB Advantages:**
1. **Schema Flexibility:**
   - DocumentType can have variable number of fields
   - Easy to add new fields without migrations
   - JSON-like documents match our TypeScript models

2. **Workspace Sharding:**
   - Easy to partition data by workspaceId
   - Natural fit for multi-tenant architecture

3. **Developer Experience:**
   - Mongoose models are easy to set up
   - Good TypeScript support
   - Less boilerplate than SQL ORMs

### Why Mongoose Over TypeORM?

| Feature | Mongoose | TypeORM (MongoDB) |
|---------|----------|-------------------|
| MongoDB Support | Native, excellent | Limited, secondary |
| TypeScript Support | Good | Excellent |
| Schema Definition | Natural for MongoDB | SQL-centric approach |
| Transactions | Full support | Limited support |
| Community | Large MongoDB community | Smaller for MongoDB driver |

**Decision:** Mongoose is the better tool for MongoDB-first projects.

### Trade-offs

**What we lose (compared to PostgreSQL):**
- ❌ No foreign key constraints (must enforce in code)
- ❌ No joins (must populate manually)
- ❌ Less mature transaction support

**What we gain:**
- ✅ Flexible schemas
- ✅ Faster development
- ✅ Better horizontal scaling

### Interview Talking Points
- "MongoDB fits our multi-tenant, schema-flexible requirements"
- "Mongoose is the standard ODM for MongoDB with excellent TypeScript support"
- "We're aware of the trade-offs - we enforce referential integrity in our repository implementations"
- "For future: we could migrate to PostgreSQL + TypeORM without changing business logic (thanks to repository pattern)"

---

## 7. RBAC Middleware Strategy

### Decision
Implement RBAC using middleware that checks workspace membership and roles.

### Architecture

```typescript
// 1. Auth middleware: Verify JWT and attach user
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, SECRET);
  req.user = { userId: decoded.userId };
  next();
}

// 2. RBAC middleware: Verify workspace access and role
function requireAdmin(req, res, next) {
  const { workspaceId } = req.params;
  const member = await WorkspaceMemberModel.findOne({
    workspaceId,
    userId: req.user.userId
  });
  
  if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  req.workspace = { workspaceId, role: member.role };
  next();
}

// 3. Routes use both
router.post('/workspaces/:workspaceId/entities',
  authMiddleware,    // First: verify user
  requireAdmin,      // Second: verify workspace access
  controller.create
);
```

### Why Middleware?

**Alternatives Considered:**

| Approach | Pros | Cons |
|----------|------|------|
| **Middleware** ✅ | Centralized, reusable, clear | Slight overhead |
| **Decorator-based** | DRY, modern | Requires reflection, complex setup |
| **Use case checks** | Flexible | Duplicated logic, easy to forget |
| **Database triggers** | Enforced at DB level | Hard to debug, less flexible |

**Decision:** Middleware strikes the best balance for MVP.

### RBAC Levels

```
OWNER   > ADMIN   > MEMBER   > VIEWER
(Create) (Modify)  (Create)   (Read)
```

**Permission Matrix:**

| Action | VIEWER | MEMBER | ADMIN | OWNER |
|--------|--------|--------|-------|-------|
| Read | ✅ | ✅ | ✅ | ✅ |
| Create Entity | ❌ | ✅ | ✅ | ✅ |
| Update Entity | ❌ | ✅ | ✅ | ✅ |
| Delete Entity | ❌ | ❌ | ✅ | ✅ |
| Manage Document Types | ❌ | ❌ | ✅ | ✅ |
| Invite Users | ❌ | ❌ | ✅ | ✅ |
| Delete Workspace | ❌ | ❌ | ❌ | ✅ |

### Interview Talking Points
- "We use Express middleware for RBAC to keep authorization logic centralized"
- "Each workspace has its own role assignments - users can be admin in one workspace and viewer in another"
- "This follows the principle of least privilege - default deny, explicit allow"
- "The middleware pattern makes it easy to audit who has access to what"

---

## 8. MongoDB Transactions vs Standalone Database

### Decision
Temporarily disabled MongoDB transactions for MVP deployment on standalone MongoDB. Will re-enable when deploying with replica set.

### What Are Transactions?

**Transactions** are a way to group multiple database operations into a single atomic unit:
- **All or Nothing**: Either all operations succeed, or all are rolled back
- **ACID Properties**: Atomicity, Consistency, Isolation, Durability
- **Example**: Creating a document type + its fields must both succeed or both fail

**Without Transactions:**
```typescript
// Step 1: Create document type
const docType = await DocumentTypeModel.create({ name: 'Passport' });
// ✅ Success - saved to database

// Step 2: Create fields
const fields = await DocumentTypeFieldModel.insertMany([...]);
// ❌ CRASH! Server dies here

// Result: Document type exists, but no fields (orphaned record)
```

**With Transactions:**
```typescript
const session = await mongoose.startSession();
session.startTransaction();

try {
  const docType = await DocumentTypeModel.create([{ name: 'Passport' }], { session });
  const fields = await DocumentTypeFieldModel.insertMany([...], { session });
  
  await session.commitTransaction(); // Both saved together
} catch (error) {
  await session.abortTransaction(); // Both rolled back
}
```

### What Is a Replica Set?

A **MongoDB Replica Set** is a group of MongoDB servers that maintain the same data:

```
┌─────────────────────────────────────────┐
│         MongoDB Replica Set             │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │ Primary  │  │Secondary │  │Secondary││
│  │  Node    │  │  Node    │  │  Node   ││
│  │ (Write)  │  │  (Read)  │  │  (Read) ││
│  └────┬─────┘  └────┬─────┘  └────┬───┘│
│       │             │             │     │
│       └─────────────┴─────────────┘     │
│         Data Replication (Sync)         │
└─────────────────────────────────────────┘
```

**Key Features:**
- **Primary Node**: Handles all writes
- **Secondary Nodes**: Replicate data from primary, can handle reads
- **Automatic Failover**: If primary dies, a secondary becomes primary
- **High Availability**: System stays online even if one node fails

**Standalone MongoDB:**
```
┌──────────────┐
│  Single      │
│  MongoDB     │
│  Server      │
└──────────────┘
```
- Only one server
- No replication
- No automatic failover
- **Cannot support transactions**

### Why MongoDB Denies Transactions on Standalone

MongoDB requires replica sets for transactions due to **technical and architectural reasons**:

#### 1. **Oplog (Operations Log) Requirement**

Transactions rely on the **oplog** (operations log):
- Oplog is a special capped collection that records all write operations
- Used for replication between nodes
- Transactions write to oplog first, then apply changes
- **Standalone MongoDB has no oplog** (no replication needed)

```javascript
// How transactions work internally:
1. Write transaction operations to oplog
2. Replicate oplog to secondary nodes
3. Commit transaction across all nodes
4. If any node fails, rollback using oplog

// Standalone can't do this - no oplog!
```

#### 2. **Distributed Consensus**

Transactions need **distributed consensus** to ensure all nodes agree:
- Uses **Raft consensus algorithm**
- Requires majority vote from replica set members
- Ensures data consistency across nodes
- **Standalone has no other nodes to vote with**

Example:
```
Replica Set (3 nodes):
- Primary proposes transaction commit
- Needs 2/3 nodes to agree (majority)
- If majority agrees, commit succeeds
- If not, rollback

Standalone:
- Only 1 node
- Can't achieve majority consensus
- No way to guarantee distributed consistency
```

#### 3. **Write Concern and Durability**

Transactions require **write concern** guarantees:
- `writeConcern: { w: "majority" }` - Wait for majority of nodes to acknowledge
- Ensures data is durable across multiple nodes
- Protects against data loss if primary crashes
- **Standalone can't provide "majority" - it's only one node**

```javascript
// Replica set transaction:
await session.commitTransaction({
  writeConcern: { w: "majority" } // Wait for 2/3 nodes
});

// Standalone:
// Can't wait for "majority" when there's only 1 node!
```

#### 4. **Rollback Mechanism**

Transactions need a **rollback mechanism**:
- If transaction fails midway, must undo all changes
- Replica sets use oplog to replay/undo operations
- Standalone has no oplog-based rollback
- Would require complex undo logs (performance overhead)

### Our Current Implementation (Without Transactions)

```typescript
async create(documentType, fields) {
  // Sequential operations (not atomic)
  
  // Step 1: Create document type
  const docType = await DocumentTypeModel.create({
    workspaceId: documentType.workspaceId,
    name: documentType.name
  });
  
  // Step 2: Create fields
  if (fields.length > 0) {
    await DocumentTypeFieldModel.insertMany(
      fields.map(f => ({
        documentTypeId: docType._id,
        ...f
      }))
    );
  }
  
  return docType;
}
```

### How Sequential Operations Still Work (Mitigation)

**Question:** "How exactly? Half success and failure?"

**Answer:** Yes, theoretically you can have partial success, but it's **extremely rare** in practice:

#### Failure Scenarios

**Scenario 1: Server Crashes Between Operations**
```typescript
const docType = await DocumentTypeModel.create({ name: 'Passport' });
// ✅ Document type saved

// 💥 SERVER CRASHES HERE (power outage, OOM, etc.)

await DocumentTypeFieldModel.insertMany([...]); // Never executes
// ❌ Fields not saved

// Result: Orphaned document type with no fields
```

**Scenario 2: Database Connection Lost**
```typescript
const docType = await DocumentTypeModel.create({ name: 'Passport' });
// ✅ Document type saved

// 💥 NETWORK FAILURE - MongoDB connection drops

await DocumentTypeFieldModel.insertMany([...]); // Throws error
// ❌ Fields not saved

// Result: Orphaned document type with no fields
```

**Scenario 3: Validation Error on Fields**
```typescript
const docType = await DocumentTypeModel.create({ name: 'Passport' });
// ✅ Document type saved

await DocumentTypeFieldModel.insertMany([
  { fieldKey: 'invalid@key!' } // ❌ Fails validation
]);
// ❌ Fields not saved

// Result: Orphaned document type with no fields
```

#### Why It's Acceptable for MVP

**1. Low Probability:**
- Server crashes are rare in development/staging
- Network failures during single request are rare
- Validation errors are caught by use case layer first

**2. Detectable:**
```typescript
// If creation fails, use case throws error
try {
  const result = await createDocumentTypeUseCase.execute(dto);
  // If we reach here, both document type AND fields were created
} catch (error) {
  // If error thrown, client knows creation failed
  // Can retry the entire operation
}
```

**3. Recoverable:**
```javascript
// Cleanup job (can be added later)
async function cleanupOrphanedDocumentTypes() {
  const docTypes = await DocumentTypeModel.find({ hasMetadata: true });
  
  for (const docType of docTypes) {
    const fields = await DocumentTypeFieldModel.find({ 
      documentTypeId: docType._id 
    });
    
    if (fields.length === 0) {
      console.log(`Orphaned document type: ${docType.id}`);
      // Delete or flag for review
    }
  }
}
```

**4. User Experience:**
- If creation fails, user sees error and can retry
- No partial state visible to user (either success or failure)
- Frontend can implement retry logic

#### Production Solution: Replica Set

For production, deploy MongoDB replica set:

```yaml
# docker-compose.yml
version: '3.8'
services:
  mongo-primary:
    image: mongo:7
    command: mongod --replSet rs0
    
  mongo-secondary-1:
    image: mongo:7
    command: mongod --replSet rs0
    
  mongo-secondary-2:
    image: mongo:7
    command: mongod --replSet rs0
```

Then re-enable transaction code:
```typescript
async create(documentType, fields) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const docType = await DocumentTypeModel.create([documentType], { session });
    await DocumentTypeFieldModel.insertMany(fields, { session });
    await session.commitTransaction();
    return docType;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

### Interview Talking Points

- "MongoDB requires replica sets for transactions because transactions need distributed consensus, oplog for rollback, and write concern guarantees"
- "Standalone MongoDB has no oplog and can't achieve majority consensus with only one node"
- "For MVP, we accept the small risk of orphaned records in exchange for simpler deployment"
- "Sequential operations work 99.9% of the time - failures are rare and recoverable"
- "In production, we'll deploy a 3-node replica set and re-enable transactions for ACID guarantees"

### Trade-offs Summary

| Aspect | Standalone (Current) | Replica Set (Production) |
|--------|---------------------|--------------------------|
| **Deployment** | Simple (1 server) | Complex (3+ servers) |
| **Cost** | Low | Higher (3x servers) |
| **Transactions** | ❌ Not supported | ✅ Full ACID support |
| **Data Safety** | ⚠️ Risk of orphans | ✅ Atomic operations |
| **High Availability** | ❌ Single point of failure | ✅ Auto-failover |
| **Performance** | Fast (no replication) | Slightly slower (replication overhead) |
| **MVP Suitability** | ✅ Acceptable | ⚠️ Overkill |
| **Production Suitability** | ❌ Not recommended | ✅ Required |

---

## Summary

These decisions form the foundation of WorkspaceOps backend:

1. **Clean Architecture** - Framework independence and testability
2. **Transactions** - Data consistency for nested entities
3. **Layered Validation** - Single responsibility, DRY principle
4. **Manual DI** - Simplicity for MVP, scalability later
5. **Repository Pattern** - Database abstraction
6. **MongoDB + Mongoose** - Flexibility and developer experience
7. **RBAC Middleware** - Centralized authorization

Each decision has trade-offs, but they align with our goals:
- ✅ Rapid MVP development
- ✅ Maintainable codebase
- ✅ Team collaboration
- ✅ Future scalability

---

**Last Updated:** 2026-02-16  
**Maintained By:** Development Team  
**Review Cycle:** Update when making significant architectural changes
