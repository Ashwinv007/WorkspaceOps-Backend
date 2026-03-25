# Contributing to WorkspaceOps Backend

Thank you for contributing. This document covers everything needed to get up and running, and the conventions to follow when making changes.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Setup](#2-local-setup)
3. [Project Structure](#3-project-structure)
4. [Development Workflow](#4-development-workflow)
5. [Branch Naming](#5-branch-naming)
6. [Commit Messages](#6-commit-messages)
7. [Pull Request Process](#7-pull-request-process)
8. [Code Style](#8-code-style)
9. [Testing Requirements](#9-testing-requirements)
10. [Architecture Rules](#10-architecture-rules)

---

## 1. Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20.x LTS | [nodejs.org](https://nodejs.org) |
| npm | 10.x+ | Bundled with Node.js |
| TypeScript | 5.x | Installed via `npm install` |
| MongoDB | Atlas account (free tier M0 is fine) | [mongodb.com/atlas](https://www.mongodb.com/atlas) |
| Git | Any recent version | [git-scm.com](https://git-scm.com) |

---

## 2. Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/workspaceops-backend.git
cd workspaceops-backend

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env — minimum required:
#   MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/workspaceops
#   JWT_SECRET=<any long random string, min 32 chars>

# 4. Start the dev server (hot-reload)
npm run dev
# API is available at http://localhost:4000
# Swagger docs at   http://localhost:4000/api-docs
# Health check at   http://localhost:4000/health
```

### Verify it's working

```bash
curl http://localhost:4000/health
# Expected: {"status":"ok"}
```

### MongoDB requirement

The dev database **must be a MongoDB replica set** to support transactions. MongoDB Atlas free tier (M0) is a 3-node replica set and works out of the box. A local `mongod` standalone instance will cause transaction errors.

---

## 3. Project Structure

```
src/
├── app.ts                        # Express app setup, middleware, route mounting
├── server.ts                     # Entry point — starts the HTTP server
├── config/                       # DB connection, env config
├── shared/                       # Cross-module code: errors, middleware, logger
│   ├── domain/errors/            # AppError, ValidationError, NotFoundError, etc.
│   └── interfaces/middleware/    # authMiddleware, rbacMiddleware, errorHandler
└── modules/                      # Feature modules (one folder per domain)
    ├── auth/
    ├── workspace/
    ├── entity/
    ├── document-type/
    ├── document/
    ├── work-item/
    ├── audit-log/
    └── overview/
```

Each module follows the same 4-layer structure:

```
module/
├── domain/          # Entities, interfaces (IRepository), value objects
├── application/     # Use cases, DTOs
├── interfaces/      # Controllers, presenters
└── infrastructure/  # Mongoose models, repository implementations, routes
```

See [PLAN/HLD.md](./PLAN/HLD.md) and [PLAN/clean_architecture_design.md](./PLAN/clean_architecture_design.md) for full architecture documentation.

---

## 4. Development Workflow

```bash
npm run dev          # Start dev server with hot-reload (ts-node-dev)
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled output (production mode)
npm test             # Run all tests (unit + integration)
npm run test:unit    # Unit tests only
npm run test:integration  # Integration tests only
npm run test:coverage     # Tests with HTML coverage report → /coverage
npx tsc --noEmit     # TypeScript type check without compiling
```

---

## 5. Branch Naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feat/<short-description>` | `feat/document-expiry-notifications` |
| Bug fix | `fix/<short-description>` | `fix/work-item-status-transition` |
| Documentation | `docs/<short-description>` | `docs/add-contributing-guide` |
| Refactor | `refactor/<short-description>` | `refactor/extract-pagination-helper` |
| Test | `test/<short-description>` | `test/overview-module-integration` |
| Chore | `chore/<short-description>` | `chore/update-mongoose-version` |

Rules:
- Use lowercase and hyphens only — no spaces, no underscores
- Keep it short (3–5 words)
- Branch off `main` for all changes

---

## 6. Commit Messages

Follow **Conventional Commits** format:

```
<type>(<scope>): <short description>

[optional body — explain WHY, not WHAT]
```

**Types:**

| Type | When to use |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `test` | Adding or updating tests |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `chore` | Dependency updates, config changes, build scripts |
| `perf` | Performance improvement |

**Examples:**

```bash
git commit -m "feat(document): add expiry status computation on read"
git commit -m "fix(work-item): reject DRAFT→COMPLETED transition with 400"
git commit -m "test(auth): add integration test for expired JWT handling"
git commit -m "docs(hld): add C4 container diagram"
git commit -m "chore: upgrade mongoose to 9.1.5"
```

Rules:
- Subject line: 50 characters or fewer
- Use imperative mood: "add", "fix", "update" — not "added", "fixed", "updated"
- No period at the end of the subject line
- Scope is optional but helpful: `(auth)`, `(document)`, `(work-item)`, etc.

---

## 7. Pull Request Process

1. **Create a branch** from `main` following the naming convention above
2. **Make your changes** — keep PRs focused on a single concern
3. **Write or update tests** — new features require integration tests; bug fixes require a test that would have caught the bug
4. **Run the full test suite** and ensure it passes: `npm test`
5. **Run the type check**: `npx tsc --noEmit`
6. **Open a PR** against `main`

### PR title format
Same as commit message format: `feat(module): short description`

### PR description should include
- What changed and why
- How to test it manually (which endpoints, what payload)
- Any breaking changes (response shape changes, env var additions)

### PR checklist
- [ ] Tests pass (`npm test`)
- [ ] TypeScript check passes (`npx tsc --noEmit`)
- [ ] New endpoints are documented in `swagger.yaml`
- [ ] If a new env var is added, it is added to `.env.example`
- [ ] No `.env` file or secrets committed

### Review
- At least one approval required before merging
- The CI pipeline must pass (TypeScript check + Jest tests)

---

## 8. Code Style

Code style is enforced automatically — just run the formatter before committing.

```bash
npx prettier --write "src/**/*.ts"   # Format all TypeScript files
npx eslint "src/**/*.ts"             # Lint check
```

Key conventions (enforced by ESLint + Prettier config in the repo):
- 2-space indentation
- Single quotes for strings
- Semicolons required
- `const` over `let` wherever possible
- No `any` type in production code paths — use proper types or generics
- Async functions must handle errors (no unhandled promise rejections)

---

## 9. Testing Requirements

### For new features
- **Integration test** covering the happy path and at least one error path (e.g. 404 when resource not found, 403 when role is insufficient)
- Test file location: `src/modules/<module>/application/__tests__/integration/<feature>.test.ts`

### For bug fixes
- A test that would have **caught the bug** before the fix — demonstrates the issue was real and is now resolved

### For refactors
- Existing tests must continue to pass — no new tests required unless behaviour changes

### Running tests
```bash
npm test                    # All tests
npm run test:unit           # Unit tests only (no DB needed)
npm run test:integration    # Integration tests (uses mongodb-memory-server)
npm run test:coverage       # Coverage report
```

Tests use `mongodb-memory-server` — no external MongoDB connection needed for tests. Do not mock the repository layer in integration tests — let the real repository implementation run against the in-memory database.

---

## 10. Architecture Rules

These rules exist to keep the codebase maintainable as it grows. See [PLAN/ADR/](./PLAN/ADR/) for the rationale behind each.

| Rule | Why |
|---|---|
| **Domain layer has zero external imports** | Domain must be pure TypeScript — no Express, Mongoose, or library imports |
| **Use Cases depend on interfaces, not implementations** | Enables unit testing with mock repositories; see ADR-001 |
| **Business logic lives in Use Cases, not controllers** | Controllers only translate HTTP ↔ Use Case; business rules in one place |
| **Controllers never catch errors** — call `next(error)` | Centralised error formatting in `errorHandler.ts`; no duplication |
| **Every query is scoped by `workspaceId`** | Multi-tenant isolation — cross-workspace data access must be impossible |
| **Audit log calls are fire-and-forget** | Never block the main operation on an observational side-effect; see ADR-006 |
| **New modules follow the 4-layer folder structure** | Consistency — any developer can navigate any module immediately |
| **No `any` in production code** | TypeScript strict mode catches errors at compile time, not runtime |

---

## Questions?

- Architecture questions: see [PLAN/HLD.md](./PLAN/HLD.md) and [PLAN/ADR/](./PLAN/ADR/)
- API reference: see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) or run the server and visit `/api-docs`
- Test results: see [PLAN/test_report.md](./PLAN/test_report.md)
