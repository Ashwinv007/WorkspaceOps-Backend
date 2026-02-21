# WorkspaceOps — Next.js Architecture Overview

> A beginner-friendly explanation of how routing, data flow, authentication, and state management
> connect together in this project. No prior Next.js knowledge assumed.

---

## Table of Contents

1. [What is Next.js?](#what-is-nextjs)
2. [How Routing Works](#how-routing-works)
3. [What is layout.tsx?](#what-is-layouttsx)
4. [How Data Fetching Works](#how-data-fetching-works)
5. [How Authentication Works](#how-authentication-works)
6. [How State is Shared Between Pages](#how-state-is-shared-between-pages)
7. [Complete Data Flow — End-to-End Example](#complete-data-flow--end-to-end-example)
8. [Folder Structure — What Goes Where](#folder-structure--what-goes-where)
9. [The 3-Layer Mental Model](#the-3-layer-mental-model)
10. [How the Key Files Connect](#how-the-key-files-connect)

---

## What is Next.js?

Next.js is a framework built on top of **React**. React is a library for building UI components. Next.js adds three key things on top:

1. **File-based routing** — the folder structure IS the URL structure
2. **A standardized project layout** — where to put pages, components, and utilities
3. **Performance features** — image optimization, automatic code splitting, etc.

We use the **App Router** — the modern approach introduced in Next.js 13. (You may see older tutorials using the "Pages Router" — ignore those; our setup is different.)

---

## How Routing Works

**The core rule: every folder inside `app/` that contains a `page.tsx` file becomes a URL.**

```
app/
├── page.tsx                     → renders at URL: /
│
├── login/
│   └── page.tsx                 → renders at URL: /login
│
├── signup/
│   └── page.tsx                 → renders at URL: /signup
│
├── workspaces/
│   └── page.tsx                 → renders at URL: /workspaces
│
└── [workspaceId]/               ← square brackets = "dynamic segment"
    ├── dashboard/
    │   └── page.tsx             → renders at URL: /abc123/dashboard
    │
    ├── entities/
    │   ├── page.tsx             → renders at URL: /abc123/entities
    │   └── [entityId]/
    │       └── page.tsx         → renders at URL: /abc123/entities/ent_456
    │
    ├── documents/
    │   ├── page.tsx             → renders at URL: /abc123/documents
    │   └── expiring/
    │       └── page.tsx         → renders at URL: /abc123/documents/expiring
    │
    ├── work-items/
    │   ├── page.tsx             → renders at URL: /abc123/work-items
    │   └── [itemId]/
    │       └── page.tsx         → renders at URL: /abc123/work-items/wi_789
    │
    ├── settings/
    │   ├── members/page.tsx         → /abc123/settings/members
    │   ├── document-types/page.tsx  → /abc123/settings/document-types
    │   └── work-item-types/page.tsx → /abc123/settings/work-item-types
    │
    └── audit-logs/
        └── page.tsx             → renders at URL: /abc123/audit-logs
```

### Dynamic Segments (`[brackets]`)

When a folder name is wrapped in square brackets (e.g. `[workspaceId]`), it acts as a **placeholder** that captures whatever value is in the URL at that position.

- URL `/abc123/entities` → `workspaceId = "abc123"`
- URL `/ws_xyz/entities/ent_456` → `workspaceId = "ws_xyz"`, `entityId = "ent_456"`

Inside the `page.tsx` file, you read these values from the `params` prop:

```tsx
// app/[workspaceId]/entities/[entityId]/page.tsx
export default function EntityDetailPage({ params }: { params: { workspaceId: string; entityId: string } }) {
  const { workspaceId, entityId } = params
  // Now use workspaceId and entityId to fetch data from the API
}
```

### Route Groups (`(parentheses)`)

Folders wrapped in parentheses are **organizational only** — they don't appear in the URL:

```
app/
├── (auth)/           ← route group — NOT in URL
│   ├── login/page.tsx    → URL is /login    (not /auth/login)
│   └── signup/page.tsx   → URL is /signup
└── (app)/            ← route group — NOT in URL
    ├── workspaces/page.tsx   → URL is /workspaces
    └── [workspaceId]/...
```

We use `(auth)` to group public pages (no sidebar) and `(app)` to group protected pages (with sidebar) — each group gets its own `layout.tsx`.

### Navigation Between Pages

To navigate between pages in Next.js, use the `Link` component (never use plain `<a>` tags):

```tsx
import Link from "next/link"

<Link href={`/${workspaceId}/entities`}>Go to Entities</Link>
```

For programmatic navigation (e.g. after a form submission), use the `useRouter` hook:

```tsx
import { useRouter } from "next/navigation"

const router = useRouter()
router.push(`/${workspaceId}/dashboard`)  // navigate programmatically
```

---

## What is `layout.tsx`?

A `layout.tsx` file **wraps** all pages inside the same folder. It persists across navigation — meaning it does NOT re-render when you move between pages in that folder.

### How it works visually:

```
[workspaceId]/layout.tsx renders:
┌──────────────────────────────────────┐
│  Sidebar  │  {children}             │
│           │                          │
│  - Dashboard        ← page.tsx fills │
│  - Entities           this slot      │
│  - Documents                         │
│           │                          │
└──────────────────────────────────────┘
```

When the user clicks from Entities to Documents, only the `{children}` area updates. The sidebar doesn't re-render or flicker.

### Layout hierarchy in our project:

```
app/layout.tsx             ← Root layout (html, body, global providers)
├── (auth)/layout.tsx      ← Auth layout (centered, no sidebar)
│   ├── login/page.tsx
│   └── signup/page.tsx
└── (app)/layout.tsx       ← App layout (route protection guard)
    └── [workspaceId]/layout.tsx  ← Workspace layout (sidebar + top bar)
        ├── dashboard/page.tsx
        ├── entities/page.tsx
        └── ...
```

### Root `layout.tsx` (app/layout.tsx)

This wraps everything. It sets up:
- The `<html>` and `<body>` tags
- Global providers: `QueryClientProvider` (TanStack Query), `Toaster` (for toast notifications)

### Workspace `layout.tsx`

This is where the **AppShell** lives — the sidebar and top bar. It renders once when you enter a workspace and stays mounted for all workspace pages.

---

## How Data Fetching Works

We use **TanStack Query** (also called React Query) to fetch data from the backend API.

### The pattern (same for every page):

```
Page loads
  → Query hook fires (sends GET request to API)
  → While waiting: show skeleton/loading UI
  → Data arrives: render it
  → If error: show error message
```

### In code:

```tsx
import { useQuery } from "@tanstack/react-query"
import { fetchEntities } from "@/lib/api/entities"

export default function EntitiesPage({ params }) {
  const { workspaceId } = params

  const { data, isLoading, error } = useQuery({
    queryKey: ["entities", workspaceId],  // ← unique cache key
    queryFn: () => fetchEntities(workspaceId),  // ← calls the API
  })

  if (isLoading) return <SkeletonTable />
  if (error) return <ErrorAlert message={error.message} />

  return (
    <div>
      <h1>Entities ({data.count})</h1>
      <EntityTable entities={data.entities} />
    </div>
  )
}
```

That's the entire data fetching pattern. `isLoading`, `data`, `error` — three states, three UI outcomes.

### Query Keys

The `queryKey` (e.g. `["entities", workspaceId]`) is how TanStack Query identifies and caches data. If you use the same key in multiple components, they share the same cached data — no duplicate API calls.

### After Creating / Editing / Deleting (Mutations)

When a user submits a form, we use `useMutation`:

```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query"

const queryClient = useQueryClient()

const mutation = useMutation({
  mutationFn: (data) => createEntity(workspaceId, data),
  onSuccess: () => {
    // Tell TanStack Query the entities list is now stale → re-fetch automatically
    queryClient.invalidateQueries({ queryKey: ["entities", workspaceId] })
    // Close the dialog
    setOpen(false)
  },
})

// In the form submit handler:
mutation.mutate({ name: "Acme Corp", role: "CUSTOMER" })
```

The key call is `invalidateQueries` — it marks the cached data as stale, which triggers an automatic re-fetch. The UI updates without a page reload.

### Parallel Fetching + Client-Side Join (Documents & Work Items)

Some pages need data from multiple endpoints to display name columns. Use `Promise.all` via parallel `useQuery` calls and join in-memory:

```tsx
// Documents page — needs entity names + document type names for table columns
const { data: docData }     = useQuery({ queryKey: ["documents", workspaceId, filters], queryFn: () => fetchDocuments(workspaceId, filters) })
const { data: entityData }  = useQuery({ queryKey: ["entities", workspaceId], queryFn: () => fetchEntities(workspaceId) })
const { data: dtData }      = useQuery({ queryKey: ["document-types", workspaceId], queryFn: () => fetchDocumentTypes(workspaceId) })

// Build lookup maps once:
const entitiesMap  = Object.fromEntries((entityData?.entities ?? []).map(e => [e.id, e.name]))
const docTypesMap  = Object.fromEntries((dtData ?? []).map(dt => [dt.id, dt.name]))

// In the table: entitiesMap[doc.entityId] ?? "—"
//               docTypesMap[doc.documentTypeId]
```

Both entities and document types are cached by TanStack Query — they are re-used across pages without extra network calls.

---

## How Authentication Works

### The Flow

**Login:**
```
1. User fills in login form
   ↓
2. Frontend calls POST /auth/login
   → backend returns { success, data: { userId, token }, message }
   ↓
3. Frontend extracts token: response.data.data.token
   localStorage.setItem("workspaceops_token", token)
   ↓
4. router.push("/workspaces")  ← user picks a workspace next
   ↓
5. All future API requests automatically include:
   Authorization: Bearer <token>
   (The Axios interceptor adds this header — you never do it manually)
   ↓
6. If backend returns 401 (token expired or invalid):
   Axios interceptor catches it → redirects to /login
```

**Signup:**
```
1. User fills in signup form
   ↓
2. Frontend calls POST /auth/signup
   → backend returns { success, data: { userId, workspaceId, token }, message }
   → signup auto-creates a Tenant + default Workspace behind the scenes
   ↓
3. Frontend extracts: response.data.data.token + response.data.data.workspaceId
   localStorage.setItem("workspaceops_token", token)
   ↓
4. router.push(`/${workspaceId}/dashboard`)  ← skip workspace selection
```

### Axios Interceptor (lib/api/client.ts)

This file creates a single Axios instance used by all API calls:

```ts
import axios from "axios"

const api = axios.create({
  baseURL: "http://localhost:4000",
})

// Before every request: add the auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("workspaceops_token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// After every response: catch 401 errors
api.interceptors.response.use(
  (response) => response,  // success — pass through
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("workspaceops_token")
      window.location.href = "/login"  // redirect to login
    }
    return Promise.reject(error)
  }
)

export default api
```

Every other API file imports and uses this `api` instance. The token header is added automatically.

### Route Protection

The `(app)/layout.tsx` checks if a token exists. If not, it redirects to `/login`:

```tsx
"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AppLayout({ children }) {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("workspaceops_token")
    if (!token) {
      router.push("/login")
    }
  }, [])

  return <>{children}</>
}
```

---

## How State is Shared Between Pages

Some data needs to be available across many pages without re-fetching it every time. We use two mechanisms:

### 1. React Context

React Context is a built-in way to make data available to any component in the tree without passing it as props through every level.

**AuthContext** (`context/AuthContext.tsx`) — stores:
- The current user object (`{ id, email, name }`)
- `login()` function — saves token to localStorage + sets user
- `logout()` function — clears localStorage + redirects to login

**WorkspaceContext** (`context/WorkspaceContext.tsx`) — stores:
- `userRole` — the current user's role in the selected workspace (OWNER / ADMIN / MEMBER)
- This is fetched once from the workspaces list and stored

Any component can read from these contexts:

```tsx
import { useWorkspaceContext } from "@/context/WorkspaceContext"

function DeleteButton() {
  const { userRole } = useWorkspaceContext()

  // Only show this button to ADMIN and OWNER
  if (userRole !== "ADMIN" && userRole !== "OWNER") return null

  return <Button variant="destructive">Delete</Button>
}
```

### 2. URL Parameters (workspaceId, entityId)

The `workspaceId` is always in the URL. Any component can read it using Next.js's `useParams()` hook:

```tsx
import { useParams } from "next/navigation"

function SomeComponent() {
  const { workspaceId } = useParams()
  // Now use workspaceId in API calls
}
```

This means the URL IS the source of truth for which workspace you're in — no need to store it separately.

### 3. Real-Time Updates (SocketProvider)

`context/SocketProvider.tsx` wraps the workspace layout. It connects to the Socket.io server (same port 4000 as REST, different protocol), joins the `workspace:{workspaceId}` room, and listens for 8 events. When an event fires, it calls `queryClient.invalidateQueries()` — which triggers the same TanStack Query re-fetch you'd trigger manually after a mutation.

```tsx
// context/SocketProvider.tsx — simplified concept
useEffect(() => {
  const socket = getSocket();               // connects to ws://localhost:4000 with JWT
  socket.emit('join-workspace', workspaceId); // joins the workspace room

  socket.on('work-item:status-changed', () => {
    queryClient.invalidateQueries({ queryKey: ['work-items', workspaceId] });
  });
  // ... 7 more events (see PLAN/realtime-infrastructure-guide.md)

  return () => {
    socket.emit('leave-workspace', workspaceId);
    socket.off('work-item:status-changed');
    // ... clean up other listeners
  };
}, [workspaceId, queryClient]);
```

**Key insight:** No page needs to know about sockets. The SocketProvider runs silently in the layout. Any page that already uses `useQuery(['work-items', workspaceId])` will automatically re-render when the event fires — zero changes to individual pages.

**8 real-time events handled:**

| Socket Event | `invalidateQueries` key |
|---|---|
| `work-item:status-changed` | `['work-items', workspaceId]` |
| `work-item:document-linked` | `['work-item', targetId]` |
| `work-item:document-unlinked` | `['work-item', targetId]` |
| `document:uploaded` | `['documents', workspaceId]` |
| `document:deleted` | `['documents', workspaceId]` |
| `workspace:member-invited` | `['members', workspaceId]` |
| `workspace:member-updated` | `['members', workspaceId]` |
| `workspace:member-removed` | `['members', workspaceId]` + `['workspaces']` |

---

## Complete Data Flow — End-to-End Example

**Scenario: User logs in, selects a workspace, opens the Entities page, and creates a new entity.**

```
Step 1: User navigates to /login
   → Login page.tsx renders
   → User types email + password + clicks "Sign In"

Step 2: Login form submits
   → calls POST http://localhost:4000/auth/login
   → backend returns { success: true, data: { userId, token }, message }
   → frontend extracts token: response.data.data.token
   → frontend stores token in localStorage
   → frontend stores userId in AuthContext
   → router.push("/workspaces")

Step 3: Workspaces page loads
   → useQuery fires: GET http://localhost:4000/workspaces
     (Axios interceptor adds Authorization header automatically)
   → backend returns array of workspaces with user's role in each
   → workspace cards render with role badges
   → user clicks "Open →" on workspace "Acme HQ"
   → WorkspaceContext stores role = "ADMIN" (from the clicked workspace)
   → router.push("/ws_xyz/dashboard")

Step 4: Dashboard page loads at /ws_xyz/dashboard
   → [workspaceId]/layout.tsx renders sidebar + top bar
   → dashboard/page.tsx renders inside the layout's {children}
   → useQuery fires: GET http://localhost:4000/workspaces/ws_xyz/overview
   → backend returns:
     {
       workspaceId: "ws_xyz",
       entities:      { total: 42, byRole: { CUSTOMER: 25, EMPLOYEE: 15, VENDOR: 1, SELF: 1 } },
       documents:     { total: 156, byStatus: { VALID: 140, EXPIRING: 10, EXPIRED: 6 } },
       workItems:     { total: 78,  byStatus: { DRAFT: 20, ACTIVE: 40, COMPLETED: 18 } },
       documentTypes: [ { id, name, hasMetadata, hasExpiry, fieldCount } ],
       workItemTypes:  [ { id, name, entityType? } ]
     }
   → stat cards render with those numbers directly from the API response
   → Dashboard panels render documentTypes[] and workItemTypes[] arrays directly

Step 5: User clicks "Entities" in sidebar
   → Next.js navigates to /ws_xyz/entities
   → layout does NOT re-render (sidebar stays, no flicker)
   → entities/page.tsx replaces dashboard/page.tsx in {children}
   → useQuery fires: GET http://localhost:4000/workspaces/ws_xyz/entities
   → while loading: skeleton rows show in the table
   → backend returns { entities: [...], count: 42 }
   → table renders with 42 entity rows

Step 6: User clicks "+ Add Entity" button
   → CreateEntityDialog opens (Dialog component)
   → User types "Acme Corp", selects "Customer" role, clicks "Add Entity"

Step 7: Form submits
   → useMutation fires: POST http://localhost:4000/workspaces/ws_xyz/entities
     Body: { name: "Acme Corp", role: "CUSTOMER" }
   → "Add Entity" button shows loading spinner (disabled + Loader2 icon)
   → backend returns 201 with the new entity object

Step 8: Success
   → queryClient.invalidateQueries(["entities", "ws_xyz"])
     → TanStack Query marks the entities list as stale
     → automatically re-fetches GET /entities
     → table re-renders with 43 rows including new "Acme Corp"
   → dialog closes
   → toast notification: "Entity created successfully"
```

No page reload. No manual state updates. No prop drilling.

---

## Modular Structure Philosophy

The backend was built with a modular folder structure — one folder per domain (entities, documents, work items, etc.), each containing its own routes, controllers, and services. **The frontend mirrors this exactly.**

Every module is a self-contained vertical slice. For any given module (e.g. Entities), you can find everything related to it in predictable locations:

| Layer | Location | Contains |
|---|---|---|
| Page (route) | `app/(app)/[workspaceId]/entities/` | `page.tsx` + `[entityId]/page.tsx` |
| Components | `components/features/entities/` | `EntityTable`, dialogs, cards |
| API functions | `lib/api/entities.ts` | All `fetch*`, `create*`, `update*`, `delete*` |
| TypeScript types | `lib/types/api.ts` (shared) | `Entity`, `CreateEntityDto` interfaces |

**Rule:** A component inside `features/entities/` never imports from `features/documents/`. If something is needed by two modules, it lives in `components/shared/`. This mirrors how the backend modules don't import each other — they go through shared utilities.

---

## Folder Structure — What Goes Where

```
workspaceops-frontend/
├── src/
│   │
│   ├── app/                              ← Next.js routes — one folder per module
│   │   ├── layout.tsx                    ← Root layout: <html>, <body>, QueryClientProvider, Toaster
│   │   ├── globals.css                   ← Tailwind base + desktop-only media query (<900px guard)
│   │   │
│   │   ├── (auth)/                       ← PUBLIC route group — no sidebar, no auth required
│   │   │   ├── layout.tsx                ← Centered full-screen layout
│   │   │   ├── login/
│   │   │   │   └── page.tsx              ← /login
│   │   │   └── signup/
│   │   │       └── page.tsx              ← /signup
│   │   │
│   │   └── (app)/                        ← PROTECTED route group — auth guard applied here
│   │       ├── layout.tsx                ← Checks for JWT token → redirects to /login if missing
│   │       ├── workspaces/
│   │       │   └── page.tsx              ← /workspaces — workspace selection screen
│   │       │
│   │       └── [workspaceId]/            ← All workspace-scoped pages
│   │           ├── layout.tsx            ← AppShell: sidebar + top bar, provides WorkspaceContext, wraps SocketProvider
│   │           │
│   │           ├── dashboard/            ← MODULE: Dashboard
│   │           │   └── page.tsx
│   │           │
│   │           ├── entities/             ← MODULE: Entities
│   │           │   ├── page.tsx          ← Entity list
│   │           │   └── [entityId]/
│   │           │       └── page.tsx      ← Entity detail (tabs: documents + work items)
│   │           │
│   │           ├── documents/            ← MODULE: Documents
│   │           │   ├── page.tsx          ← Document list
│   │           │   └── expiring/
│   │           │       └── page.tsx      ← Expiring/expired documents view
│   │           │
│   │           ├── work-items/           ← MODULE: Work Items
│   │           │   ├── page.tsx          ← Work items list (kanban + table)
│   │           │   └── [itemId]/
│   │           │       └── page.tsx      ← Work item detail
│   │           │
│   │           ├── settings/             ← MODULE: Settings (ADMIN+ only)
│   │           │   ├── members/
│   │           │   │   └── page.tsx
│   │           │   ├── document-types/
│   │           │   │   └── page.tsx
│   │           │   └── work-item-types/
│   │           │       └── page.tsx
│   │           │
│   │           └── audit-logs/           ← MODULE: Audit Logs (ADMIN+ only)
│   │               └── page.tsx
│   │
│   ├── components/
│   │   ├── ui/                           ← shadcn auto-generated — DO NOT EDIT
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── badge.tsx
│   │   │   └── ...  (all shadcn primitives)
│   │   │
│   │   ├── layout/                       ← App shell — used by [workspaceId]/layout.tsx only
│   │   │   ├── AppShell.tsx              ← Outer wrapper: sidebar + topbar + <main>
│   │   │   ├── Sidebar.tsx               ← Nav links, workspace switcher, user info, sign out
│   │   │   └── TopBar.tsx                ← Breadcrumbs + user role badge
│   │   │
│   │   ├── shared/                       ← Used by 2+ modules — no module-specific logic
│   │   │   ├── StatusBadge.tsx           ← ALL badge types in one component (see SHADCN_COMPONENT_MAPPING.md)
│   │   │   ├── EmptyState.tsx            ← Generic "no data" display with optional CTA
│   │   │   ├── ConfirmDialog.tsx         ← Reusable AlertDialog for any destructive action
│   │   │   ├── StatCard.tsx              ← Dashboard stat cards (icon, count, breakdown)
│   │   │   ├── DynamicMetadataForm.tsx   ← Renders inputs from DocumentType.fields[] schema
│   │   │   └── FileUploadZone.tsx        ← Drag-and-drop file picker
│   │   │
│   │   └── features/                     ← One sub-folder per module — components stay in their module
│   │       │
│   │       ├── entities/                 ← MODULE: Entities components
│   │       │   ├── EntityTable.tsx       ← Table with role badge, edit/delete actions
│   │       │   ├── CreateEntityDialog.tsx
│   │       │   └── EditEntityDialog.tsx
│   │       │
│   │       ├── documents/                ← MODULE: Documents components
│   │       │   ├── DocumentTable.tsx     ← Table with expiry badge, download/edit/delete
│   │       │   ├── UploadDocumentDialog.tsx  ← Multi-step: file → metadata → expiry
│   │       │   └── EditDocumentDialog.tsx
│   │       │
│   │       ├── work-items/               ← MODULE: Work Items components
│   │       │   ├── WorkItemKanban.tsx    ← 3-column kanban board layout
│   │       │   ├── WorkItemCard.tsx      ← Card used inside kanban columns
│   │       │   ├── WorkItemTable.tsx     ← Table view alternative
│   │       │   ├── CreateWorkItemDialog.tsx
│   │       │   └── LinkDocumentDialog.tsx  ← Searchable picker to link documents
│   │       │
│   │       ├── dashboard/                ← MODULE: Dashboard components
│   │       │   ├── OverviewStatCards.tsx ← The 3 stat cards (entities, docs, work items)
│   │       │   └── AlertBanner.tsx       ← Expiring documents amber alert
│   │       │
│   │       ├── settings/                 ← MODULE: Settings components
│   │       │   ├── members/
│   │       │   │   ├── MembersTable.tsx
│   │       │   │   └── InviteMemberDialog.tsx
│   │       │   ├── document-types/
│   │       │   │   ├── DocumentTypeCard.tsx      ← Expandable card with fields table
│   │       │   │   ├── CreateDocumentTypeDialog.tsx  ← Complex form with field builder
│   │       │   │   └── AddFieldDialog.tsx
│   │       │   └── work-item-types/
│   │       │       ├── WorkItemTypeCard.tsx
│   │       │       └── CreateWorkItemTypeDialog.tsx
│   │       │
│   │       └── audit-logs/               ← MODULE: Audit Logs components
│   │           ├── AuditLogTable.tsx
│   │           └── AuditLogFilters.tsx   ← Filter bar with dropdowns + date pickers
│   │
│   ├── lib/                              ← Pure logic — no React components here
│   │   │
│   │   ├── api/                          ← One file per API module (mirrors backend modules)
│   │   │   ├── client.ts                 ← Axios instance + request interceptor (auth) + response interceptor (401)
│   │   │   ├── auth.ts                   ← login(email, password), signup(name, email, password)
│   │   │   ├── workspaces.ts             ← fetchWorkspaces, createWorkspace, fetchMembers, inviteMember, updateMemberRole, removeMember
│   │   │   ├── entities.ts               ← fetchEntities(workspaceId, role?), fetchEntityById, createEntity, updateEntity, deleteEntity
│   │   │   ├── document-types.ts         ← fetchDocumentTypes, fetchDocumentType, createDocumentType, addField, deleteDocumentType
│   │   │   ├── documents.ts              ← fetchDocuments(workspaceId, {documentTypeId?, entityId?, expiryStatus?}), fetchExpiringDocuments, uploadDocument, updateDocument, deleteDocument, downloadDocument
│   │   │   ├── work-items.ts             ← fetchWorkItems, fetchWorkItem, createWorkItem, updateWorkItem, updateStatus, linkDocument, unlinkDocument, deleteWorkItem
│   │   │   ├── audit-logs.ts             ← fetchAuditLogs
│   │   │   └── overview.ts               ← fetchOverview → returns { workspaceId, entities: { total, byRole }, documents: { total, byStatus }, workItems: { total, byStatus }, documentTypes: OverviewDocumentType[], workItemTypes: OverviewWorkItemType[] }
│   │   │
│   │   ├── socket/                       ← Socket.io client
│   │   │   └── socketClient.ts           ← Singleton: connect with JWT auth, getSocket(), disconnectSocket()
│   │   │
│   │   ├── hooks/                        ← Custom React hooks (shared logic)
│   │   │   ├── useWorkspaceRole.ts       ← Returns userRole string from WorkspaceContext
│   │   │   └── useDownloadDocument.ts    ← fetch + Authorization header + Blob download
│   │   │
│   │   └── types/
│   │       └── api.ts                    ← TypeScript interfaces for ALL API response schemas
│   │                                        (User, Workspace, WorkspaceMember,
│   │                                         Entity, DocumentType, Document,
│   │                                         WorkItem, WorkItemType, AuditLog,
│   │                                         WorkspaceOverview with OverviewDocumentType & OverviewWorkItemType,
│   │                                         plus list wrappers: EntityListResponse { entities[], count },
│   │                                         DocumentListResponse { documents[], count },
│   │                                         WorkItemListResponse { workItems[], count },
│   │                                         MembersListResponse { members[], count })
│   │
│   └── context/
│       ├── AuthContext.tsx               ← Provides: { user, login(), logout() }
│       ├── WorkspaceContext.tsx          ← Provides: { workspaceId, userRole }
│       └── SocketProvider.tsx            ← Connects to Socket.io, joins workspace room, maps 8 events → invalidateQueries
│
├── public/
│   └── favicon.ico
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

### Module Boundary Rules

These rules keep the codebase clean as it grows:

| Rule | Example |
|---|---|
| Components in `features/X/` only import from `features/X/` or `shared/` or `ui/` | `features/entities/EntityTable.tsx` can import `shared/StatusBadge.tsx` ✓ but NOT `features/documents/DocumentTable.tsx` ✗ |
| `lib/api/X.ts` files only import from `lib/api/client.ts` | `entities.ts` imports `client` — nothing else ✓ |
| Pages (`app/.../page.tsx`) call API hooks and pass data to feature components | Page fetches → passes `entities` prop to `EntityTable` ✓ |
| `shared/` components have zero knowledge of any module | `EmptyState` has no imports from `features/` ✓ |
| `context/` is the only place global state lives | No module-level global stores ✓ |

---

## The 3-Layer Mental Model

Every feature in the app has exactly three layers. Understanding this makes the codebase predictable:

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: Routing (Next.js)                             │
│  "Which page to show"                                   │
│                                                         │
│  URL /ws_xyz/entities  →  entities/page.tsx renders     │
└──────────────────────────────┬──────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────┐
│  LAYER 2: Data Fetching (TanStack Query + Axios)        │
│  "What data to display"                                 │
│                                                         │
│  useQuery  →  GET /workspaces/ws_xyz/entities           │
│           →  { entities: [...], count: 42 }             │
└──────────────────────────────┬──────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────┐
│  LAYER 3: Rendering (React + shadcn/ui)                 │
│  "How to show it"                                       │
│                                                         │
│  data.entities.map(entity => <EntityRow entity={entity} />)  │
│  data.count  →  "Entities (42)"                         │
│  entity.role →  <StatusBadge value={entity.role} />     │
└─────────────────────────────────────────────────────────┘
```

- **Next.js** never touches data — it just says which component to render
- **TanStack Query** never touches the UI — it just manages data fetching and caching
- **React + shadcn** never fetches — it just takes data as props and renders it

---

## How the Key Files Connect

```
User visits /ws_xyz/entities
           │
           ▼
app/(app)/[workspaceId]/layout.tsx
  - Checks auth token (redirects to /login if missing)
  - Renders <Sidebar> and <TopBar>
  - Reads workspaceId from params
  - Fetches workspaces list to get userRole for this workspace
  - Provides WorkspaceContext({ workspaceId, userRole })
  - Wraps children in <SocketProvider workspaceId={workspaceId}>
      → getSocket() connects to ws://localhost:4000 with JWT
      → socket.emit('join-workspace', workspaceId)
      → on 'work-item:status-changed' → invalidateQueries(['work-items', workspaceId])
      → on 'workspace:member-invited' → invalidateQueries(['members', workspaceId])
      → (and 6 other events — see PLAN/realtime-infrastructure-guide.md)
  - Renders {children} slot
           │
           ▼
app/(app)/[workspaceId]/entities/page.tsx
  - Calls useQuery using lib/api/entities.ts → fetchEntities(workspaceId)
  - lib/api/entities.ts uses lib/api/client.ts (Axios instance)
  - client.ts reads token from localStorage, adds Authorization header
  - Renders components/features/entities/EntityTable.tsx with data
  - EntityTable.tsx uses components/ui/table.tsx (shadcn)
  - EntityTable.tsx uses components/shared/StatusBadge.tsx for role badges
  - EntityTable.tsx uses context/WorkspaceContext to know if user is ADMIN
    (to show or hide the delete button)
```

Every page in the app follows this exact same pattern.
