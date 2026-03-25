# Use Case Diagram — WorkspaceOps

> **Document Type:** Requirements — Use Case Diagram
> **Related:** [HLD.md](./HLD.md) · [FRD](./FRD%20WorkspaceOps.pdf) · [HLR List](./HLR%20list%20for%20Workspace%20Ops.pdf)

---

## What is a Use Case Diagram?

A **Use Case Diagram** is a UML diagram that answers one question: **"Who can do what in this system?"**

It shows:
- **Actors** — roles that interact with the system (not specific users — roles)
- **Use Cases** — actions the system can perform (verbs)
- **Associations** — which actors can trigger which use cases
- **Generalization** — when one actor inherits all capabilities of another (`OWNER` can do everything `ADMIN` can)
- **System Boundary** — the box that separates what is inside the system from what is outside

Use case diagrams live in the **Requirements phase** of the SDLC. They are the first diagram drawn — before HLD, before LLD. They answer "what does the system do and for whom" before anyone thinks about "how."

---

## Actors

WorkspaceOps has **4 roles** that form a strict hierarchy. Each inherits all capabilities of the role below it.

```
OWNER  ⊃  ADMIN  ⊃  MEMBER  ⊃  VIEWER
```

| Actor | Description |
|---|---|
| **VIEWER** | Read-only access to workspace data |
| **MEMBER** | VIEWER + can create/update/delete entities, documents, work items |
| **ADMIN** | MEMBER + can invite/remove members, manage roles |
| **OWNER** | ADMIN + can delete the workspace, transfer ownership |
| **Guest** | Unauthenticated user — can only register and log in |

---

## Use Case Diagram

> Mermaid renders this diagram in GitHub, VS Code, and Obsidian.
> Actors are on the left. The system boundary is the outer box. Each subgraph is a module.
> Dashed arrows show actor generalization (inheritance).

```mermaid
flowchart LR
    %% ── Actors ────────────────────────────────────────────
    Guest(["👤 Guest\n(Unauthenticated)"])
    Viewer(["👁️ VIEWER"])
    Member(["👷 MEMBER"])
    Admin(["🔧 ADMIN"])
    Owner(["👑 OWNER"])

    %% ── Actor Generalization (inheritance) ────────────────
    Viewer -.->|inherits| Guest
    Member -.->|inherits| Viewer
    Admin  -.->|inherits| Member
    Owner  -.->|inherits| Admin

    %% ── System Boundary ───────────────────────────────────
    subgraph SYS["WorkspaceOps System"]

        subgraph AUTH["Authentication"]
            UC1(Register account)
            UC2(Log in)
        end

        subgraph WS["Workspace Management"]
            UC3(Create workspace)
            UC4(View workspace)
            UC5(Update workspace settings)
            UC6(Delete workspace)
            UC7(Invite member)
            UC8(Remove member)
            UC9(Update member role)
        end

        subgraph ENT["Entity Management"]
            UC10(View entities)
            UC11(Create entity)
            UC12(Update entity)
            UC13(Delete entity)
        end

        subgraph DT["Document Type Management"]
            UC14(View document types)
            UC15(Create document type)
            UC16(Update document type)
            UC17(Delete document type)
            UC18(Add field to document type)
        end

        subgraph DOC["Document Management"]
            UC19(View documents)
            UC20(Upload document)
            UC21(Update document)
            UC22(Delete document)
        end

        subgraph WI["Work Item Management"]
            UC23(View work items)
            UC24(Create work item)
            UC25(Update work item)
            UC26(Update work item status)
            UC27(Link / unlink document)
            UC28(Delete work item)
        end

        subgraph AL["Audit & Overview"]
            UC29(View audit logs)
            UC30(View dashboard overview)
        end

    end

    %% ── Guest associations ────────────────────────────────
    Guest --> UC1
    Guest --> UC2

    %% ── VIEWER associations ───────────────────────────────
    Viewer --> UC4
    Viewer --> UC10
    Viewer --> UC14
    Viewer --> UC19
    Viewer --> UC23
    Viewer --> UC30

    %% ── MEMBER associations ───────────────────────────────
    Member --> UC3
    Member --> UC11
    Member --> UC12
    Member --> UC13
    Member --> UC15
    Member --> UC16
    Member --> UC17
    Member --> UC18
    Member --> UC20
    Member --> UC21
    Member --> UC22
    Member --> UC24
    Member --> UC25
    Member --> UC26
    Member --> UC27
    Member --> UC28

    %% ── ADMIN associations ────────────────────────────────
    Admin --> UC7
    Admin --> UC8
    Admin --> UC29

    %% ── OWNER associations ────────────────────────────────
    Owner --> UC5
    Owner --> UC6
    Owner --> UC9
```

---

## Actor–Use Case Matrix

A quicker reference — who can do what, at a glance.

| Use Case | Guest | VIEWER | MEMBER | ADMIN | OWNER |
|---|:---:|:---:|:---:|:---:|:---:|
| Register account | ✅ | | | | |
| Log in | ✅ | | | | |
| **Workspace** | | | | | |
| Create workspace | | | ✅ | ✅ | ✅ |
| View workspace | | ✅ | ✅ | ✅ | ✅ |
| Update workspace settings | | | | | ✅ |
| Delete workspace | | | | | ✅ |
| Invite member | | | | ✅ | ✅ |
| Remove member | | | | ✅ | ✅ |
| Update member role | | | | | ✅ |
| **Entity** | | | | | |
| View entities | | ✅ | ✅ | ✅ | ✅ |
| Create / Update / Delete entity | | | ✅ | ✅ | ✅ |
| **Document Type** | | | | | |
| View document types | | ✅ | ✅ | ✅ | ✅ |
| Create / Update / Delete document type | | | ✅ | ✅ | ✅ |
| Add field to document type | | | ✅ | ✅ | ✅ |
| **Document** | | | | | |
| View documents | | ✅ | ✅ | ✅ | ✅ |
| Upload / Update / Delete document | | | ✅ | ✅ | ✅ |
| **Work Item** | | | | | |
| View work items | | ✅ | ✅ | ✅ | ✅ |
| Create / Update / Delete work item | | | ✅ | ✅ | ✅ |
| Update work item status | | | ✅ | ✅ | ✅ |
| Link / unlink document | | | ✅ | ✅ | ✅ |
| **Audit & Overview** | | | | | |
| View audit logs | | | | ✅ | ✅ |
| View dashboard overview | | ✅ | ✅ | ✅ | ✅ |

---

## Key Design Choices Visible in This Diagram

**1. Actor generalization (inheritance)**
OWNER ⊃ ADMIN ⊃ MEMBER ⊃ VIEWER. Every OWNER can do everything an ADMIN can — they are not separate permission sets, they are a hierarchy. This is represented by the `inherits` dashed arrows in the diagram.

**2. Role is workspace-scoped**
The same user can be OWNER in Workspace A and VIEWER in Workspace B. The actor in this diagram represents a *role within a workspace*, not a global user type.

**3. Audit logs are ADMIN+ only**
Audit logs contain sensitive information (who changed what, when). MEMBER and VIEWER cannot access them — only ADMIN and OWNER.

**4. Workspace deletion is OWNER-only**
Creating a workspace makes you OWNER automatically. Only the OWNER can delete it — not even ADMIN. This prevents admins from accidentally or maliciously destroying workspaces.

**5. Guest has no workspace access**
An unauthenticated user can only register or log in. Every other use case requires authentication and workspace membership.

---

*Use Case Diagram — Version 1.0.0 — 2026-03-23*