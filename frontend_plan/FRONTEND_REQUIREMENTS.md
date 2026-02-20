# WorkspaceOps — Frontend Requirements

> Every screen, every button, every card, every input — described in plain language.
> All values displayed are taken directly from API responses. No client-side calculations.

---

## Project-Wide Policies

### Desktop Only

This application is **desktop-only**. It is not designed or tested for mobile or tablet screens.

**Implementation:** A single global CSS media query in the root stylesheet. If the viewport width is less than **900px**, the entire app is replaced by a full-screen message. No responsive layouts, no breakpoint handling in components — just this one guard:

```css
/* In globals.css — add at the top level */
@media (max-width: 899px) {
  body > * {
    display: none !important;
  }
  body::before {
    content: "";
    display: flex;
  }
  #mobile-message {
    display: flex !important;
  }
}
```

A `<div id="mobile-message">` is placed in the root `layout.tsx` outside the app shell:

```html
<!-- Always in DOM, hidden on desktop via CSS, shown only on <900px -->
<div id="mobile-message" style="display:none">
  Please open WorkspaceOps on a desktop browser.
</div>
```

**No JavaScript required.** Pure CSS media query handles this entirely.

**Minimum desktop layout width:** 1024px is the design target. The 900px threshold provides a small buffer for slightly smaller desktop windows.

### Theme

Black and white only throughout the UI. See `SHADCN_COMPONENT_MAPPING.md` for the complete theme policy and the explicit list of color exceptions (status badges, priority badges, alert banners).

### Modular Structure

Each API module (Entities, Documents, Work Items, Settings, Audit Logs) is a self-contained folder in both `app/` (routes) and `components/features/` (components). See `NEXTJS_OVERVIEW.md` for the full folder structure.

---

## Table of Contents

1. [Auth Screens](#auth-screens)
2. [Workspace Selection Screen](#workspace-selection-screen)
3. [App Shell (Persistent Layout)](#app-shell-persistent-layout)
4. [Dashboard Screen](#dashboard-screen)
5. [Entities Module](#entities-module)
6. [Documents Module](#documents-module)
7. [Work Items Module](#work-items-module)
8. [Settings Module](#settings-module)
9. [Audit Logs Screen](#audit-logs-screen)

---

## Auth Screens

### Login Screen

**Purpose:** Let existing users sign in.

**Layout:**
- The screen is vertically and horizontally centered
- A white card (rounded, shadowed) sits in the middle of a neutral/light background
- Above the card: app logo or name "WorkspaceOps" in bold

**Inside the card:**
- Heading: "Sign in to your account" (large text)
- Sub-heading: "Enter your email and password below" (small gray text)
- **Email field** — labeled "Email", type email, placeholder "you@example.com"
- **Password field** — labeled "Password", type password, placeholder "••••••"
- **Sign In button** — full-width, primary color (blue/dark), text "Sign In"
- Below the button: small text — "Don't have an account?" + a clickable link "Sign up"

**Post-login flow:**
- API response shape: `{ success, data: { userId, token }, message }`
- On success: store `data.token` in localStorage → redirect to `/workspaces`
- No workspaceId in the login response — the user picks a workspace on the next screen

**Error handling:**
- If login fails (401): a red alert banner appears at the top of the card — "Invalid email or password"
- If any field is empty on submit: inline red text under the field — "Email is required" / "Password is required"

---

### Signup Screen

**Purpose:** Register a new user account.

**Layout:** Same centered card layout as login.

**Inside the card:**
- Heading: "Create your account"
- Sub-heading: "Start tracking your workspace operations"
- **Name field** — labeled "Name (optional)", placeholder "John Doe"
- **Email field** — labeled "Email", required
- **Password field** — labeled "Password", required, helper text below: "Minimum 6 characters"
- **Create Account button** — full-width, primary color
- Below: "Already have an account?" + "Sign in" link

**Post-signup flow:**
- API response shape: `{ success, data: { userId, workspaceId, token }, message }`
- On success: store `data.token` in localStorage + store `data.workspaceId` → redirect directly to `/{workspaceId}/dashboard`
- No workspace selection step needed — signup auto-creates a default workspace

**Error handling:**
- 400 (validation): red inline text under offending field
- 409 (email taken): red alert banner — "An account with this email already exists"
- Password < 6 chars: inline text "Password must be at least 6 characters"

---

## Workspace Selection Screen

**Purpose:** Show all workspaces the user belongs to. Entry point after login.

**Layout:** Full-page, no sidebar yet.

**Top header bar:**
- Left: App logo / "WorkspaceOps" text
- Right: User's name + small chevron → dropdown menu with "Sign out"

**Main content area:**
- Page heading: "Your Workspaces" (large, bold)
- Sub-text: "Select a workspace to continue, or create a new one"

**Workspace cards grid** (2–3 columns on desktop, 1 on mobile):

Each **WorkspaceCard** contains:
- Workspace name (large, bold)
- Role badge (e.g. "OWNER", "ADMIN", "MEMBER") — small pill-shaped tag with color
- Created date in a small gray line: "Created Feb 20, 2026"
- "Open →" button at the bottom — clicking enters that workspace's dashboard

**Top-right button:** "+ New Workspace" — clicking opens a Create Workspace dialog

**Empty state** (when user has no workspaces):
- A centered area with a folder/building icon
- Text: "You don't have any workspaces yet"
- Button: "Create your first workspace"

**Create Workspace Dialog:**
- Title: "Create a new workspace"
- **Workspace name field** — required, labeled "Workspace Name", placeholder "Acme HQ"
- Two buttons at bottom: "Cancel" (outline) and "Create Workspace" (primary)
- If name is missing: inline validation error under the field

> **Note (implementation detail — not shown to user):** The backend `POST /workspaces` endpoint requires a `tenantId`. The user never types this. The frontend reads the `tenantId` silently from the workspaces list already loaded on the page (first workspace in the `GET /workspaces` response) and sends it automatically in the request body. The dialog shows only one field.

---

## App Shell (Persistent Layout)

Once inside a workspace, every screen shares this outer layout.

### Left Sidebar

**Always visible on desktop, collapsible drawer on mobile.**

**Top section:**
- Workspace name in bold
- Small switch/dropdown icon next to it — clicking takes user back to `/workspaces`

**Navigation links (with icons on the left of each label):**
- Dashboard (grid icon)
- Entities (people icon)
- Documents (file icon)
- Work Items (checkbox icon)
- Settings (gear icon) — clicking expands into sub-links:
  - Members — visible only to ADMIN and OWNER
  - Document Types — visible only to ADMIN and OWNER
  - Work Item Types — visible only to ADMIN and OWNER
- Audit Logs (history/clock icon) — visible only to ADMIN and OWNER

The active/current page link is highlighted (bold + colored left border or background pill).

**Bottom section:**
- User's avatar (circle with initials) + user name
- "Sign out" small link

### Top Bar

Runs across the top above the main page content:
- **Breadcrumbs** — e.g. "WorkspaceOps / Acme HQ / Entities"
- **User's role badge** in this workspace — e.g. "ADMIN" pill tag (pulled from workspace list API response `role` field)

---

## Dashboard Screen

**Purpose:** At-a-glance summary of the entire workspace.
**API:** `GET /workspaces/:workspaceId/overview`

**Layout:** Wide content area. Row 1 has 3 stat cards. Row 2 has 2 side-by-side panels.

### Row 1 — Stat Cards

**Entities Card:**
- Large total number at top — from `entities.total`
- Label: "Total Entities"
- Breakdown list below (values from `entities.byRole`):
  - "Customers: 25"
  - "Employees: 15"
  - "Vendors: 1"
  - "Self: 1"

**Documents Card:**
- Large total number — from `documents.total`
- Label: "Total Documents"
- Breakdown with colored dots (values from `documents.byStatus`):
  - Green dot — "Valid: 140"
  - Amber dot — "Expiring: 10"
  - Red dot — "Expired: 6"

**Work Items Card:**
- Large total number — from `workItems.total`
- Label: "Total Work Items"
- Breakdown with colored dots (values from `workItems.byStatus`):
  - Gray dot — "Draft: 20"
  - Blue dot — "Active: 40"
  - Green dot — "Completed: 18"

### Alert Banner

Only shown when `documents.byStatus.EXPIRED > 0` or `documents.byStatus.EXPIRING > 0`:
- Amber/yellow background banner spanning full width
- Warning icon on the left
- Text: "X documents are expiring soon and Y are already expired" (X and Y from API)
- "View expiring documents →" link on the right → navigates to `/documents/expiring`

### Row 2 — Two Side-by-Side Panels

**Document Types Panel (left):**
- Heading: "Document Types"
- List of document type rows from `documentTypes[]` in overview response:
  - Name (bold)
  - "Has Expiry" tag (shown only if `hasExpiry: true`)
  - "Has Metadata" tag (shown only if `hasMetadata: true`)
  - Small text showing field count: "3 fields" (from `fieldCount` in overview response)
- "Manage →" link at the bottom → navigates to `/settings/document-types`

**Work Item Types Panel (right):**
- Heading: "Work Item Types"
- List of work item type rows from `workItemTypes[]`:
  - Name (bold)
  - Entity Type badge (shown only if `entityType` is set) — e.g. "Employee"
- "Manage →" link → navigates to `/settings/work-item-types`

---

## Entities Module

### Entity List Screen

**API:** `GET /workspaces/:workspaceId/entities`

**Header row:**
- Left: "Entities" heading + count in parentheses "(42)" — from `count` field
- Right: "+ Add Entity" button (primary blue) — visible to MEMBER and above

**Filter tabs (below header):**
- Tabs: All | Customer | Employee | Vendor | Self
- Active tab is underlined/highlighted
- Clicking a tab re-fetches with `?role=CUSTOMER` (or `EMPLOYEE`, `VENDOR`, `SELF`); "All" tab omits the param

**Table — one row per entity:**

| Column | Content |
|---|---|
| Name | Clickable text → navigates to entity detail screen |
| Role | Colored badge pill ("Customer", "Employee", etc.) |
| Created | Date in human-readable format (e.g. "Feb 20, 2026") |
| Actions | Pencil icon (edit) + Trash icon (delete, ADMIN+ only) |

**Empty state** (when `entities[]` is empty for that filter):
- Icon + "No entities found"
- If on "All" tab: show "+ Add Entity" CTA button

---

**Create Entity Dialog:**
- Title: "Add Entity"
- **Name field** — required, placeholder "Acme Corp", max 255 chars
- **Role dropdown** — required, options: Customer / Employee / Vendor / Self
- Buttons: "Cancel" + "Add Entity" (primary)

**Edit Entity Dialog:**
- Same fields, pre-filled with current values
- Title: "Edit Entity"
- Buttons: "Cancel" + "Save Changes" (primary)

---

### Entity Detail Screen

**APIs:**
- `GET /workspaces/:workspaceId/entities/:entityId` — fetch entity name + role (supports direct URL navigation / bookmarks)
- `GET /workspaces/:workspaceId/entities/:entityId/documents`
- `GET /workspaces/:workspaceId/entities/:entityId/work-items`

**Header:**
- Large bold entity name (e.g. "Acme Corp")
- Entity role badge next to name (e.g. "Customer")
- Right side buttons:
  - "Edit" button (outline style) → opens Edit Entity Dialog
  - "Delete" button (red, only shown to ADMIN+) → opens Confirm Delete Dialog

**Confirm Delete Dialog:**
- Text: "Are you sure you want to delete [Entity Name]? This cannot be undone."
- Buttons: "Cancel" + "Delete" (red/destructive)

**Tabs below header:**
- "Documents" tab
- "Work Items" tab

**Documents Tab:**
- Same document table as the main Documents screen but pre-filtered to this entity
- "+ Upload Document" button at top right (pre-selects this entity in the upload dialog)

**Work Items Tab:**
- List of work items for this entity (same card format as the work items list)
- "+ Create Work Item" button at top right (pre-selects this entity in the create dialog)

---

## Documents Module

### Document List Screen

**API:** `GET /workspaces/:workspaceId/documents`

**Header row:**
- Left: "Documents" heading + count "(156)" — from `count` field
- Right: "+ Upload Document" button (primary, visible to MEMBER+)

**Filter bar (below header):**
- Dropdown: "All Document Types" → list of document type names (uses `documentTypeId` query param)
- Dropdown: "All Entities" → list of entity names (uses `entityId` query param)
- Status tabs: All | Valid | Expiring | Expired — clicking re-fetches with `?expiryStatus=VALID` (or `EXPIRING`, `EXPIRED`); "All" omits the param

**Table — one row per document:**

| Column | Content |
|---|---|
| File Name | Clicking triggers an authenticated file download |
| Document Type | Name looked up from `documentTypeId` — page must pre-fetch `GET /document-types` and join client-side |
| Entity | Entity name looked up from `entityId`, or "—" if not linked — page must pre-fetch `GET /entities` and join client-side |
| Status | Colored badge — Valid (green), Expiring (amber), Expired (red) — from `doc.expiryStatus` |
| Expiry Date | Date string from `doc.expiryDate`, or "—" if no expiry |
| Uploaded | Date from `doc.createdAt` |
| Actions | Download icon · Pencil icon (MEMBER+) · Trash icon (ADMIN+) |

> **Implementation note (GAP 6):** The document API response only includes `documentTypeId` and `entityId` — not names. The page must fetch both `GET /document-types` and `GET /entities` in parallel alongside `GET /documents`, then build lookup maps: `entitiesMap[doc.entityId]?.name ?? "—"` and `docTypesMap[doc.documentTypeId]?.name`.

**Empty state:** "No documents uploaded yet"

---

### Upload Document Dialog (Multi-Step)

A dialog with a step indicator at the top: **"1. File & Type → 2. Metadata → 3. Expiry"**

Steps 2 and 3 are conditional — they only appear if the selected document type requires them.

**Step 1 — File & Type:**
- **File upload zone** — large dashed-border box with an upload icon in the center
  - Text: "Drag and drop your file here, or click to browse"
  - After file is selected: shows filename + file size + a green checkmark
- **Document Type dropdown** (required) — searchable, lists all document types
- **Entity dropdown** (optional) — searchable, lists all entities, placeholder "No entity (optional)"
- Button: "Next →" (disabled until file + document type are selected)

**Step 2 — Metadata** (only shown if `documentType.hasMetadata === true`):
- Heading: "Fill in document details"
- Sub-text: "These fields are specific to the [Document Type Name] template"
- For each field in `documentType.fields[]`:
  - If `fieldType === "text"`: text input labeled with `fieldKey`, required if `isRequired: true`
  - If `fieldType === "date"`: date picker input labeled with `fieldKey`, required if `isRequired: true`
- Buttons: "← Back" and "Next →"

**Step 3 — Expiry** (only shown if `documentType.hasExpiry === true`):
- Heading: "Set expiry date"
- Date picker for expiry date
- Buttons: "← Back" and "Upload Document" (primary)

After successful upload: dialog closes, document appears in the list.

---

### Edit Document Dialog

**Title:** "Edit Document"

**Note at top of dialog:** "You cannot replace the file. You can update the metadata and other details."

- **Entity dropdown** — searchable, pre-filled with current entity (or empty if none)
- **Expiry Date picker** — pre-filled if expiry date is set
- **Metadata fields** — same dynamic form as Step 2 above, pre-filled with `doc.metadata` values
- Buttons: "Cancel" + "Save Changes" (primary)

---

### Expiring Documents Screen

**API:** `GET /workspaces/:workspaceId/documents/expiring?days=N`

**Response shape:** Direct array — `Document[]` with no wrapper. Unlike the main documents list (`{ documents: [...], count }`), this endpoint returns a plain array. There is no `count` field; omit count from the screen header.

**Header:** "Expiring Documents"

**Days selector:**
- Row of toggle buttons: "7 days" | "14 days" | "30 days" | "60 days" | "90 days"
- Active selection is highlighted
- Clicking a button re-fetches from API with the selected value as `?days=N`

**Table:** Same columns as the Document List table. Only EXPIRING and EXPIRED documents are shown (backend filters this). The Status badge column is visually prominent.

---

## Work Items Module

### Work Items List Screen

**API:** `GET /workspaces/:workspaceId/work-items`

**Response shape:** `{ workItems: [...], count: N }` — use `data.workItems` (not `data` directly as an array).

**Header row:**
- Left: "Work Items" heading
- Right: View toggle buttons (Kanban icon | Table icon) + "+ Create Work Item" button (primary, MEMBER+)

**Filter bar:**
- Status dropdown: All Statuses / Draft / Active / Completed — sends `?status=DRAFT` etc.
- Priority dropdown: All Priorities / Low / Medium / High — sends `?priority=LOW` etc.
- Work Item Type dropdown: All Types / [list of types] — sends `?workItemTypeId=...`
- Entity dropdown: All Entities / [list of entities] — sends `?entityId=...`

---

### Kanban View

Three side-by-side columns. Column header shows the status name + count badge:
- **DRAFT** column (gray header) — shows count e.g. "(20)"
- **ACTIVE** column (blue header) — shows count e.g. "(40)"
- **COMPLETED** column (green header) — shows count e.g. "(18)"

**WorkItemCard** (inside each column):
- **Title** — bold text, clickable → navigates to work item detail screen
- **Priority badge** — Low (gray), Medium (amber), High (red) — from `workItem.priority`
- **Entity name** — small gray text — from entity linked to this work item _(GAP 6: join client-side — `entitiesMap[workItem.entityId]?.name ?? "—"` using entities pre-fetched for the workspace)_
- **Due date** — small text, e.g. "Due Mar 15, 2026" — from `workItem.dueDate`
- **Status transition button** (at the bottom of the card):
  - DRAFT card → "Start →" button → calls PATCH status to ACTIVE
  - ACTIVE card → "Complete ✓" button (green) + "Unstart" ghost button → PATCH to COMPLETED or DRAFT
  - COMPLETED card → "Reopen" button → calls PATCH status to ACTIVE

---

### Table View

| Column | Content |
|---|---|
| Title | Clickable text → work item detail |
| Type | Work item type name — looked up from `workItemTypeId` (join client-side from `GET /work-item-types`) |
| Entity | Entity name — looked up from `entityId` (join client-side from `GET /entities`) |
| Priority | Priority badge |
| Status | Status badge |
| Due Date | Formatted date or "—" |
| Actions | Pencil icon (edit) · Trash icon (delete, ADMIN+) |

> **Implementation note (GAP 6):** Work item API returns `workItemTypeId` and `entityId` — not names. The page must pre-fetch `GET /entities` and `GET /work-item-types` in parallel, then build lookup maps.

---

### Create Work Item Dialog

- Title: "Create Work Item"
- **Work Item Type dropdown** (required) — list of all work item types
- **Entity dropdown** (required) — list of all entities
- **Title field** (required) — text input, max 255 chars
- **Description** (optional) — textarea, max 2000 chars, placeholder "Describe the task..."
- **Priority select** (optional) — "No priority" / Low / Medium / High
- **Due Date picker** (optional)
- Small note at bottom: "New work items always start as Draft"
- Buttons: "Cancel" + "Create Work Item" (primary)

---

### Work Item Detail Screen

**APIs:**
- `GET /workspaces/:workspaceId/work-items/:id` — includes `linkedDocumentIds[]`
- `GET /workspaces/:workspaceId/work-items/:id/documents`

**Header:**
- Large bold title from `workItem.title`
- Status badge next to title — from `workItem.status`
- Priority badge — from `workItem.priority`

**Status Action Bar (row below the header):**
- If `status === "DRAFT"`: one button — "Start Work Item →" (blue primary) → calls PATCH to ACTIVE
- If `status === "ACTIVE"`: two buttons — "Mark as Complete ✓" (green) → PATCH to COMPLETED, and "Move back to Draft" (ghost/outline) → PATCH to DRAFT
- If `status === "COMPLETED"`: one button — "Reopen Work Item" (outline) → calls PATCH to ACTIVE

**Info grid (2 columns):**
- Entity: entity name as a clickable link → navigates to entity detail
- Work Item Type: type name
- Due Date: from `workItem.dueDate`
- Assigned To: `workItem.assignedToUserId` (displayed as-is)
- Created: from `workItem.createdAt`
- Last Updated: from `workItem.updatedAt`

**Description section:**
- Label "Description"
- Text content from `workItem.description`, displayed as plain text
- If no description: "No description" in gray
- Small "Edit" link → opens Edit Work Item dialog

**Linked Documents section:**
- Label "Linked Documents"
- Data: call `GET /workspaces/:workspaceId/work-items/:id/documents`
  - Response: `{ linkedDocuments: [...], count }` — full document objects, NOT just link metadata
  - Each item includes: `fileName`, `expiryStatus`, `downloadUrl`, `linkedAt`, `documentTypeId`
- List of linked document rows:
  - File name — from `doc.fileName`
  - Document type name — join client-side: `documentTypesMap[doc.documentTypeId]?.name ?? "—"` (fetch `GET /document-types` in parallel)
  - Expiry status badge (VALID / EXPIRING / EXPIRED / NONE) — from `doc.expiryStatus`
  - "Download" icon button → opens `doc.downloadUrl` (authenticated)
  - "Unlink" icon (X) → calls DELETE to unlink (does NOT delete the document)
- "+ Link Document" button → opens Link Document Picker dialog
- If no linked documents: "No documents linked yet"

**Footer buttons:**
- "Edit Work Item" button (outline, MEMBER+) → opens Edit Work Item dialog
- "Delete Work Item" button (red/destructive, ADMIN+) → opens Confirm Delete dialog

---

### Edit Work Item Dialog

- Same fields as Create dialog, all pre-filled with current values
- Status field is NOT here — use the Status Action Bar on the detail screen
- Buttons: "Cancel" + "Save Changes" (primary)

---

### Link Document Picker Dialog

Opens when clicking "+ Link Document" on the work item detail screen.

- Title: "Link a Document"
- **Search input** at the top — "Search documents..."
- Scrollable list of workspace documents:
  - Each row: file name + document type name + entity name (if linked) + status badge
  - Clicking a row → calls POST to link the document → dialog closes → document appears in linked list
- "Cancel" button at the bottom

---

## Settings Module

### Members Screen (ADMIN+ only)

**APIs:**
- `GET /workspaces/:id/members` — load members table; response: `{ members: [...], count }` — use `data.count` for the header badge
- `POST /workspaces/:id/members` — invite by email
- `PUT /workspaces/:id/members/:memberId` — change role
- `DELETE /workspaces/:id/members/:memberId` — remove member

**Header:** "Members" + count "(5)" — count from `GET /members` response `count` field
**Top-right button:** "+ Invite Member" (primary) → opens Invite Member Dialog

**Members Table:**

| Column | Content |
|---|---|
| User | `userId` shown as-is (from API response) |
| Role | Colored role badge |
| Joined | `createdAt` date formatted |
| Actions | Role change dropdown · Remove button (trash, red) |

- **Role change dropdown** — inline select on the row; changing it calls PUT immediately
- **Remove button** — opens Confirm Remove Dialog → calls DELETE on confirm

**Invite Member Dialog:**
- Title: "Invite a member"
- **Email field** — required, placeholder "colleague@company.com", helper "Their registered WorkspaceOps email"
- **Role select** — required, options: Admin / Member
- Buttons: "Cancel" + "Send Invite" (primary)
- Error states displayed as alert banners inside the dialog:
  - 404: "No account found with this email. They need to sign up first."
  - 409: "This person is already a member of this workspace."

---

### Document Types Screen (ADMIN+ only)

**APIs:**
- `GET /workspaces/:workspaceId/document-types`
- `POST /workspaces/:workspaceId/document-types`
- `POST /workspaces/:workspaceId/document-types/:id/fields`
- `DELETE /workspaces/:workspaceId/document-types/:id`

**Header:** "Document Types" + count
**Top-right button:** "+ Create Document Type" → opens Create Document Type Dialog

**Document Type List — one DocumentTypeCard per type:**

Each card shows:
- Name (bold)
- "Has Expiry" badge (shown only if `hasExpiry: true`)
- "Has Metadata" badge (shown only if `hasMetadata: true`)
- Field count: e.g. "3 fields"
- Expand arrow → reveals a table of the type's fields:

  | Field Key | Type | Required | Expiry Field |
  |---|---|---|---|
  | passport_number | Text | Yes | No |
  | expiry_date | Date | Yes | Yes |

- Bottom action row:
  - "+ Add Field" text button → opens Add Field Dialog
  - "Delete Type" button (red) → opens Confirm Delete Dialog → calls DELETE

---

**Create Document Type Dialog:**

- Title: "Create Document Type"
- **Name field** — required
- **"Has Metadata" toggle switch** — with label: "This document type has structured metadata fields"
- **"Has Expiry" toggle switch** — with label: "Documents of this type have an expiry date"
- **Fields section** (only appears when either toggle is ON):
  - Label "Fields" + "+ Add Field" button
  - Each field row (horizontal, inline form):
    - Text input: "Field key" (e.g. "passport_number", alphanumeric + underscore)
    - Select: "Type" → Text / Date
    - Toggle: "Required"
    - Toggle: "Expiry Field" (only enabled when Type = Date)
    - "×" remove button on the right end of the row
  - Validation note shown when "Has Expiry" is ON: "At least one Date field must be marked as Expiry Field"
- Buttons: "Cancel" + "Create Document Type" (primary)

**Add Field Dialog (for an existing document type):**

- Title: "Add Field to [Type Name]"
- Same field row inputs as above
- Buttons: "Cancel" + "Add Field" (primary)

---

### Work Item Types Screen (ADMIN+ only)

**APIs:**
- `GET /workspaces/:workspaceId/work-item-types`
- `POST /workspaces/:workspaceId/work-item-types`
- `DELETE /workspaces/:workspaceId/work-item-types/:id`

**Header:** "Work Item Types" + count — from `data.count` in `GET /work-item-types` response `{ workItemTypes: [...], count }` (use `data.workItemTypes`, not `data` as array)
**Top-right button:** "+ Create Work Item Type" → opens Create Work Item Type Dialog

**Work Item Type List — one card per type:**

Each card shows:
- Name (bold)
- Description text (truncated to 2 lines, "Show more" link if longer)
- Entity Type badge (only shown if `entityType` is set) — e.g. "Applies to: Employees"
- Delete button (trash icon, red, ADMIN+) → Confirm Delete Dialog

**Create Work Item Type Dialog:**

- Title: "Create Work Item Type"
- **Name field** — required, max 255 chars
- **Description field** — optional, textarea, max 1000 chars, placeholder "Describe when this type of task is used..."
- **Entity Type restriction** (optional):
  - Select dropdown: "Any entity type (no restriction)" / Customer / Employee / Vendor / Self
  - Helper text: "When set, this type only applies to entities with that role"
- Buttons: "Cancel" + "Create" (primary)

---

## Audit Logs Screen (ADMIN+ only)

**API:** `GET /workspaces/:workspaceId/audit-logs`

**Header:** "Audit Logs" + total count (from `total` in API response)

**Filter bar:**
- **User ID input** — text field, placeholder "Filter by user ID..."
- **Action type dropdown** — "All actions" + all 24 types grouped by category:
  - Auth: User Signup, User Login
  - Workspace: Workspace Created, Member Invited, Member Removed, Member Role Updated
  - Entity: Entity Created, Entity Updated, Entity Deleted
  - Document Type: Document Type Created, Updated, Deleted, Field Added
  - Document: Document Uploaded, Updated, Deleted
  - Work Item: Work Item Type Created, Work Item Type Deleted, Work Item Created, Updated, Status Changed, Deleted, Document Linked, Document Unlinked
- **Target Type dropdown** — All / WorkItem / Entity / Document / DocumentType / WorkItemType / WorkspaceMember
- **Date range** — two date pickers: "From date" and "To date"
- "Apply Filters" button + "Clear" link

**Audit Log Table — one row per log entry:**

| Column | Content |
|---|---|
| Timestamp | `log.createdAt` formatted to date + time |
| User | `log.userId` shown as-is |
| Action | Colored category badge (see below) |
| Target Type | `log.targetType` as plain text |
| Target ID | `log.targetId` or "—" if null |

**Action badge colors by category:**
- Auth actions → gray
- Workspace actions → blue
- Entity actions → green
- Document Type + Document actions → amber/orange
- Work Item actions → purple

**Pagination bar (below the table):**
- Text: "Showing 1–50 of 342 entries" — values from `offset`, `limit`, `total` in API response
- "← Previous" button — disabled when `offset === 0`
- "Next →" button — disabled when `offset + limit >= total`
- Clicking a button sends a new request with the updated offset
