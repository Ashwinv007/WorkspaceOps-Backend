# 🎓 Complete Beginner's Guide to Auth Module

## 😵 Feeling Lost? You're Not Alone!

**I know it looks like a LOT of folders and files.** Let me break it down in the simplest way possible, like explaining to someone who just learned JavaScript yesterday.

---

## 🗺️ The Big Picture: What Happens When Someone Signs Up?

Imagine you're ordering pizza:

1. **You call the pizza place** (User sends HTTP request)
2. **Person answers phone** (Controller receives request)
3. **They write down your order** (Use case processes it)
4. **Kitchen makes pizza** (Repository saves to database)
5. **They call you back with confirmation** (Response sent back)

That's EXACTLY how our auth module works! Let's trace a real signup request through every single file.

---

## 📂 Folder Structure - Think of it Like a Building

```
auth/
├── domain/              🏛️ THE RULES (Pure business logic)
├── application/         🎯 THE WORK (What to do)
├── interfaces/          📞 THE FRONT DESK (Talking to outside world)
└── infrastructure/      🔧 THE MACHINERY (Database, JWT, etc.)
```

**Why so many layers?**
- So if you want to swap MongoDB for PostgreSQL tomorrow, you only change `infrastructure/`
- Business rules stay safe in `domain/` - nobody can accidentally break them
- Everything has ONE job (easier to debug!)

---

## 🚀 Let's Follow a Real Request: User Signup

### Step 1: User Sends Request (HTTP POST /auth/signup)

```javascript
// User sends this JSON:
{
  "email": "john@example.com",
  "password": "secret123",
  "name": "John Doe"
}
```

---

### Step 2: Routes File Catches It 🎯

**File**: `infrastructure/routes/auth.routes.ts`

```typescript
// This is like the receptionist at a building
router.post('/signup', authController.signup);
//            ↑ path       ↑ who handles it
```

**What's happening here?**
- Express is watching for `POST` requests to `/auth/signup`
- When it sees one, it calls `authController.signup()`

**"Why create a whole class for this?"**
- Because the controller needs other stuff (use cases, presenters)
- Classes let us bundle everything together nicely
- In plain JS, you'd do this with objects, but TypeScript makes it cleaner

---

### Step 3: Controller Receives Request 📞

**File**: `interfaces/http/AuthController.ts`

```typescript
async signup(req, res, next) {
    try {
        // 1. Get data from request body
        const result = await this.signupUseCase.execute(req.body);
        
        // 2. Format response nicely
        res.status(201).json(this.presenter.toSignupResponse(result));
    } catch (error) {
        next(error); // Send errors to error handler
    }
}
```

**In plain English:**
1. "Hey SignupUseCase, here's the user data. Do your thing!"
2. "SignupUseCase finished! Let me format this nicely for the user."
3. "If anything goes wrong, pass it to the error handler."

**Controller's ONLY job**: Talk to HTTP (get request, send response)

---

### Step 4: Use Case Does the Work 🎯

**File**: `application/use-cases/SignupUser.ts`

This is the **conductor of an orchestra**. It coordinates everything:

```typescript
async execute(dto) {
    // 1. Check if user already exists
    const existingUser = await this.userRepo.findByEmail(dto.email);
    if (existingUser) {
        throw new AppError('User already exists');
    }

    // 2. Hash the password (security!)
    const passwordHash = await this.tokenService.hashPassword(dto.password);

    // 3. Create user entity
    const userToSave = User.create(dto.email, passwordHash, dto.name);

    // 4. Save user to database
    const savedUser = await this.userRepo.save(userToSave);

    // 5. Create tenant (organization)
    const tenant = await this.tenantRepo.create({
        name: `${dto.email}'s Tenant`
    });

    // 6. Create workspace
    const workspace = await this.workspaceRepo.create({
        tenantId: tenant.id,
        name: 'Default Workspace'
    });

    // 7. Make user the OWNER
    await this.workspaceUserRepo.create({
        workspaceId: workspace.id,
        userId: savedUser.id,
        role: 'OWNER'
    });

    // 8. Generate login token
    const token = this.tokenService.generateToken(savedUser.id, savedUser.email);

    return {
        userId: savedUser.id,
        workspaceId: workspace.id,
        token
    };
}
```

**Why is this separate from the controller?**
- Because this logic has NOTHING to do with HTTP
- You could use this same code in a CLI tool, mobile app, or GraphQL API
- It's pure business logic

---

### Step 5: User Entity - The Rules 🏛️

**File**: `domain/entities/User.ts`

```typescript
class User {
    constructor(id, email, passwordHash, name) {
        this.id = id;
        this.email = email;
        this.passwordHash = passwordHash;
        this.name = name;
        
        this.validate(); // Check if data is valid
    }

    validate() {
        if (!this.email || !this.email.trim()) {
            throw new ValidationError('Email is required');
        }
        
        if (!this.isValidEmail(this.email)) {
            throw new ValidationError('Invalid email format');
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}
```

**Why a class instead of a plain object?**

**Bad way (plain object):**
```javascript
const user = {
    email: "invalid-email", // OOPS! No validation
    passwordHash: ""        // OOPS! Empty password
};
// No errors until it breaks later!
```

**Good way (class with validation):**
```javascript
const user = new User("1", "invalid-email", "", "John");
// ❌ IMMEDIATELY throws: "Invalid email format"
// You catch errors RIGHT AWAY instead of later!
```

Classes **enforce rules**. They're like a bouncer at a nightclub - won't let bad data in.

---

### Step 6: Repository - Talks to Database 🔧

**File**: `infrastructure/mongoose/UserRepositoryImpl.ts`

```typescript
async save(user) {
    // Create Mongoose document
    const doc = await UserModel.create({
        email: user.email,
        passwordHash: user.passwordHash,
        name: user.name
    });

    // Convert MongoDB document back to our User entity
    return new User(
        doc._id.toString(),
        doc.email,
        doc.passwordHash,
        doc.name,
        doc.createdAt,
        doc.updatedAt
    );
}
```

**Why not just use Mongoose directly?**

Because tomorrow you might switch to PostgreSQL! If you do:
- ✅ Just rewrite `UserRepositoryImpl` to use PostgreSQL
- ✅ Everything else stays the same
- ❌ Without this pattern, you'd have to change code EVERYWHERE

---

## 🔑 TypeScript vs JavaScript - What You Need to Know

### Interfaces (The "Contract")

**JavaScript:**
```javascript
// No way to enforce what data looks like
function login(data) {
    // Hope data has email and password!
}
```

**TypeScript:**
```typescript
interface LoginDTO {
    email: string;
    password: string;
}

function login(data: LoginDTO) {
    // TypeScript GUARANTEES data has email & password
    // Your editor shows autocomplete!
}
```

**Interfaces are like a checklist.** They say "this data MUST have these fields."

### Classes with Constructor

**JavaScript (old way):**
```javascript
function User(email, password) {
    this.email = email;
    this.password = password;
}
```

**TypeScript (modern way):**
```typescript
class User {
    constructor(
        public readonly email: string,
        public readonly password: string
    ) {}
}
```

Both do the same thing! TypeScript is just more concise.

---

## 🎬 Complete Flow - Animated Story

```
1. USER
   ↓ POST /auth/signup { "email": "john@test.com", "password": "123" }
   
2. ROUTES (infrastructure/routes/auth.routes.ts)
   ↓ "Someone wants to sign up! Send to AuthController!"
   
3. CONTROLLER (interfaces/http/AuthController.ts)
   ↓ "Got HTTP request! Extract data, call SignupUseCase"
   
4. USE CASE (application/use-cases/SignupUser.ts)
   ↓ "Alright, let me orchestrate this..."
   ├─ Check if user exists (userRepo.findByEmail)
   ├─ Hash password (tokenService.hashPassword)
   ├─ Create User entity (domain validation happens!)
   ├─ Save user (userRepo.save)
   ├─ Create tenant (tenantRepo.create)
   ├─ Create workspace (workspaceRepo.create)  
   ├─ Assign OWNER role (workspaceUserRepo.create)
   └─ Generate JWT token (tokenService.generateToken)
   
5. REPOSITORY (infrastructure/mongoose/UserRepositoryImpl.ts)
   ↓ "Save this to MongoDB..."
   
6. DATABASE (MongoDB)
   ↓ "User saved with ID: 698950a2964..."
   
7. BACK UP THE CHAIN
   Repository → Use Case → Controller → User
   
8. USER RECEIVES:
   {
     "success": true,
     "data": {
       "userId": "698950a2964...",
       "workspaceId": "698950a2965...",
       "token": "eyJhbGci..."
     },
     "message": "User registered successfully"
   }
```

---

## 🤔 Common Questions

### Q: Why not just put everything in one file?

**A:** Imagine your car:
- Engine in engine compartment
- Seats in passenger area
- Wheels outside

You COULD build a car with everything mixed together, but good luck fixing it!

Same with code:
- Database stuff in `infrastructure/`
- Business rules in `domain/`
- HTTP handling in `interfaces/`

When something breaks, you know EXACTLY where to look.

---

### Q: What's with all these "I" prefixes? (IUserRepository, ITokenService)

**A:** The "I" means "Interface" - it's a contract/promise.

```typescript
// This is a PROMISE: "Anyone implementing this MUST have these methods"
interface IUserRepository {
    findByEmail(email: string): Promise<User | null>;
    save(user: User): Promise<User>;
}

// This FULFILLS the promise using Mongoose
class UserRepositoryImpl implements IUserRepository {
    // Must have findByEmail and save, or TypeScript yells at you!
}
```

**Why?** So you can swap implementations! You could have:
- `UserRepositoryMongooseImpl` (using MongoDB)
- `UserRepositoryPostgresImpl` (using PostgreSQL)
- `UserRepositoryMemoryImpl` (for testing)

All work with the same interface!

---

### Q: What's `async/await`? (Coming from JS)

**Before (callbacks):**
```javascript
saveUser(user, function(err, result) {
    if (err) {
        console.log('Error!');
    } else {
        generateToken(result.id, function(err, token) {
            // Callback hell!
        });
    }
});
```

**Now (async/await):**
```javascript
const user = await saveUser(user);
const token = await generateToken(user.id);
// Clean and readable!
```

`await` means "wait for this to finish before moving on."

---

## 🎯 Quick Reference: "Where Do I Put X?"

| I want to... | Put it in... | Example |
|--------------|--------------|---------|
| Add validation rule | `domain/entities/` | Email format check |
| Create new API endpoint | `infrastructure/routes/` | POST /auth/logout |
| Add business workflow | `application/use-cases/` | ResetPassword flow |
| Talk to database | `infrastructure/mongoose/` | Save/find operations |
| Handle HTTP request | `interfaces/http/` | Controller methods |
| Define data shape | `application/dto/` | SignupDTO interface |

---

## 🔥 Try This Yourself!

1. **Open**: `infrastructure/routes/auth.routes.ts`
2. **Find**: Line with `router.post('/signup'...`
3. **Follow the chain**: Controller → Use Case → Repository
4. **Use the test file**: `test-auth.http`
5. **Watch the logs**: See your request flow through!

---

## 💡 The "Aha!" Moment

**Clean Architecture is just organizing code by separating:**
- **WHY** (domain - business rules)
- **WHAT** (application - workflows)
- **HOW** (infrastructure - technical details)
- **TALK** (interfaces - communicate with outside)

Once you get this, everything clicks! 🎉

---

## 🆘 Still Confused?

**Start here:**
1. Open `test-auth.http`
2. Send a signup request
3. Put `console.log("STEP 1: Controller")` in `AuthController.signup`
4. Put `console.log("STEP 2: Use Case")` in `SignupUser.execute`
5. Watch the logs flow!

**You'll SEE the path your request takes!** 👀
