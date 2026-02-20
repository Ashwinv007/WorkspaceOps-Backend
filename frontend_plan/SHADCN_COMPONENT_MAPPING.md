# WorkspaceOps — shadcn/ui Component Mapping

> Every UI requirement from FRONTEND_REQUIREMENTS.md mapped to its exact shadcn/ui component (or Tailwind pattern).
> This is the bridge between "what we need" and "how we build it".

---

## Theme Policy

### Light Theme Only

The application uses shadcn's **light theme** — white backgrounds, dark/black text. This is the standard shadcn default and requires no extra configuration.

- **Background**: white (`--background: white`)
- **Text**: near-black (`--foreground: dark`)
- **Muted areas** (sidebar, table headers): very light gray (`--muted`)
- **Borders**: light gray (`--border`)
- **Cards, inputs, dialogs**: white background with gray border

**No dark mode.** A theme toggle is not planned. When running `npx shadcn@latest init`, choose **"zinc"** or **"neutral"** as the base color and select **"light"** as the default theme. Do not add the `dark` class anywhere in the app.

If shadcn's init adds a `ThemeProvider` with dark mode support — remove it. The root `layout.tsx` should not have any dark mode wrapper. The `globals.css` CSS variables only need the `:root` block (light), not the `.dark` block.

### Explicit Color Exceptions

Three groups of components require semantic color because users must instantly understand meaning at a glance. Using black/white for these would make the app confusing or unsafe (e.g. users might miss an EXPIRED document).

**All color exceptions use Tailwind utility classes** — no extra libraries or installs needed. Tailwind is already included with shadcn.

| Component | Why Color Is Required | Colors Used |
|---|---|---|
| Expiry Status badges | Users scanning documents must instantly see EXPIRED (danger) vs VALID (safe). Black/white cannot convey urgency. | Red, Amber, Green |
| Work Item Status badges | Kanban board columns need visual distinction. ACTIVE vs COMPLETED vs DRAFT need to be scannable. | Blue, Green, Gray |
| Priority badges | HIGH priority items need to stand out from LOW. Critical for task management. | Red, Amber, Gray |
| Expiring documents alert banner | Must catch attention — it's a warning that requires action. | Amber/Yellow |
| Destructive action buttons (delete, remove) | Red clearly signals danger and destructive intent. shadcn includes `variant="destructive"` built-in. | Red (built-in) |

All other components — nav, tables, cards, dialogs, forms, most badges (Role, EntityRole, Audit) — use black/white only.

---

## Table of Contents

1. [Layout Components](#layout-components)
2. [Form Elements](#form-elements)
3. [Data Display](#data-display)
4. [Badges — Black/White vs Color Exceptions](#badges--blackwhite-vs-color-exceptions)
5. [Buttons](#buttons)
6. [Dialogs & Overlays](#dialogs--overlays)
7. [Navigation](#navigation)
8. [Feedback & State](#feedback--state)
9. [Icons Reference](#icons-reference)
10. [shadcn Components to Install](#shadcn-components-to-install)

---

## Layout Components

All layout components use the neutral shadcn theme — no color overrides.

| Requirement | shadcn / Tailwind Implementation |
|---|---|
| Auth screen — centered card | `Card` + `CardHeader` + `CardContent` + `CardFooter`. Outer wrapper: `className="flex min-h-screen items-center justify-center bg-muted/40"` |
| Auth card logo area | Plain `div` above the `Card` with `className="text-center mb-6"` |
| App shell — sidebar + content | Custom layout: `flex h-screen`. Left: fixed-width `aside` (240px). Right: `flex-1 overflow-auto`. No color — uses default `background` and `border` |
| Sidebar border | Right border: `className="border-r"` — uses `border` CSS variable (light gray in neutral theme) |
| Workspace card grid | CSS Grid: `className="grid grid-cols-2 xl:grid-cols-3 gap-4"` |
| Single WorkspaceCard | `Card` + `CardHeader` (name + badge) + `CardContent` (date) + `CardFooter` ("Open" button) |
| Stat card (dashboard) | `Card` + `CardContent` with custom inner layout |
| Dashboard panels row | `className="grid grid-cols-2 gap-6"` — two `Card` side by side |
| Kanban board columns | `className="grid grid-cols-3 gap-4"` — three column `div`s with subtle `bg-muted` background |
| WorkItemCard (kanban) | `Card` + `CardContent` |
| DocumentTypeCard (expandable) | `Collapsible` + `CollapsibleTrigger` + `CollapsibleContent` |
| Tabs (entity detail, filter tabs) | `Tabs` + `TabsList` + `TabsTrigger` + `TabsContent` — default shadcn styling (black underline) |
| Page content area | `main` with `className="flex-1 p-6 overflow-auto"` |
| Section header row (title + button) | `className="flex items-center justify-between mb-6"` |

---

## Form Elements

All form elements use default shadcn styling — black borders, white backgrounds.

| Requirement | shadcn Component |
|---|---|
| Text input (name, title, etc.) | `Input` |
| Email input | `Input type="email"` |
| Password input | `Input type="password"` |
| Long text / description | `Textarea` |
| Simple dropdown (role, status, priority) | `Select` + `SelectTrigger` + `SelectContent` + `SelectItem` |
| Searchable dropdown (entities, doc types) | `Popover` + `Command` + `CommandInput` + `CommandList` + `CommandItem` — the shadcn Combobox pattern |
| Date picker | `Popover` trigger (shows selected date as text) + `Calendar` inside — default black/white styling |
| Toggle / on-off switch | `Switch` — default black when ON |
| Form field label | `Label` (always paired with its input using `htmlFor`) |
| Helper text below input | Plain `p` with `className="text-sm text-muted-foreground mt-1"` |
| Inline validation error | Plain `p` with `className="text-sm text-destructive mt-1"` — `text-destructive` is red (built into shadcn, acceptable exception for error states) |
| File upload zone | Custom `div` with `className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50"`. Hidden `<input type="file" className="hidden">`, click handler calls `ref.current.click()`. |
| Dynamic metadata fields | `Array.map()` over `documentType.fields[]` — renders `Input` or date picker per field |
| Form submit loading | `Button disabled` + `<Loader2 className="animate-spin mr-2 h-4 w-4" />` + "Loading..." text |

### Form Wiring
All forms use **React Hook Form** + **Zod**:
- `useForm()` manages field state
- `zodResolver(schema)` connects Zod schema for validation
- `<Controller>` wraps non-native inputs (`Select`, `Switch`, date picker)
- `formState.errors` drives inline error messages

---

## Data Display

### Tables

All tables use the shadcn `Table` family — default neutral styling.

```
Table
└── TableHeader
    └── TableRow
        └── TableHead  (column labels — muted-foreground text)
TableBody
└── TableRow (one per data row, hover:bg-muted/50)
    └── TableCell
```

Table container: `className="w-full"`. For wide tables: `div` wrapper with `className="overflow-x-auto"`.

### Specific Table Patterns

| Table | Notes |
|---|---|
| Entity table | Name (link, underline on hover), Role (badge), Created, Actions |
| Document table | File Name (link), Doc Type, Entity, **Status (color badge — exception)**, Expiry Date, Uploaded, Actions |
| Work Items table | Title (link), Type, Entity, **Priority (color badge — exception)**, **Status (color badge — exception)**, Due Date, Actions |
| Members table | User ID, Role (outline badge — black/white), Joined, Actions |
| Audit log table | Timestamp, User, Action (outline badge — black/white by category), Target Type, Target ID |

### Pagination

```
div className="flex items-center justify-between mt-4"
├── p className="text-sm text-muted-foreground"  → "Showing 1–50 of 342 entries"
└── div className="flex gap-2"
    ├── Button variant="outline" size="sm" disabled={offset === 0}  → "← Previous"
    └── Button variant="outline" size="sm" disabled={atEnd}         → "Next →"
```

---

## Badges — Black/White vs Color Exceptions

### Black/White Badges (Default)

These badges use only the neutral shadcn theme. No color overrides.

| Badge | Value | Implementation |
|---|---|---|
| Role: OWNER | "Owner" | `Badge variant="default"` (black fill, white text) |
| Role: ADMIN | "Admin" | `Badge variant="secondary"` (gray fill) |
| Role: MEMBER | "Member" | `Badge variant="outline"` (border only, no fill) |
| Role: VIEWER | "Viewer" | `Badge variant="outline" className="text-muted-foreground"` |
| Entity: CUSTOMER | "Customer" | `Badge variant="outline"` |
| Entity: EMPLOYEE | "Employee" | `Badge variant="outline"` |
| Entity: VENDOR | "Vendor" | `Badge variant="secondary"` |
| Entity: SELF | "Self" | `Badge variant="default"` |
| Audit Action (any) | action text | `Badge variant="outline"` — use a small prefix to group: "WI: Created" etc. |

> **Note on Role/Entity badges:** Different entity roles need to be visually distinguishable from each other. Using the four built-in shadcn badge variants (default, secondary, outline, + muted outline) achieves this without color. If further distinction is needed, `font-medium` vs regular weight can be used as a differentiator.

### Color Exception Badges

These badges are the **only** place color is used in the app. All colors are Tailwind utility classes — already available, no extra installs.

The `Badge` component in shadcn accepts a `className` prop. Passing Tailwind color utilities overrides the variant colors.

```tsx
// shadcn Badge component already installed
// Just pass className for color exceptions:
<Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
  Valid
</Badge>
```

**Expiry Status** (`expiryStatus` from API):

| Value | Label | className |
|---|---|---|
| `VALID` | "Valid" | `bg-green-100 text-green-800 border-green-200` |
| `EXPIRING` | "Expiring" | `bg-amber-100 text-amber-800 border-amber-200` |
| `EXPIRED` | "Expired" | `bg-red-100 text-red-800 border-red-200` |

**Work Item Status** (`status` from API):

| Value | Label | className |
|---|---|---|
| `DRAFT` | "Draft" | `Badge variant="secondary"` — gray, no color override needed |
| `ACTIVE` | "Active" | `bg-blue-100 text-blue-800 border-blue-200` |
| `COMPLETED` | "Completed" | `bg-green-100 text-green-800 border-green-200` |

**Priority** (`priority` from API):

| Value | Label | className |
|---|---|---|
| `LOW` | "Low" | `Badge variant="outline"` — neutral, no color override needed |
| `MEDIUM` | "Medium" | `bg-amber-100 text-amber-800 border-amber-200` |
| `HIGH` | "High" | `bg-red-100 text-red-800 border-red-200` |

> **Are these available in shadcn?** Yes. shadcn's `Badge` component is a plain `div` with a `className` prop. These Tailwind utility classes (`bg-green-100`, `text-red-800`, etc.) are part of Tailwind CSS which is installed as a dependency of shadcn — no extra installs required.

### Shared `StatusBadge` Component

A single component handles all badge variants to keep color logic in one place:

```tsx
// components/shared/StatusBadge.tsx
import { Badge } from "@/components/ui/badge"

type StatusBadgeProps = {
  type: "expiry" | "workItemStatus" | "priority" | "role" | "entityRole"
  value: string
}

export function StatusBadge({ type, value }: StatusBadgeProps) {
  const colorMap: Record<string, string> = {
    // Expiry — color exceptions
    VALID:      "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
    EXPIRING:   "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100",
    EXPIRED:    "bg-red-100 text-red-800 border-red-200 hover:bg-red-100",
    // Work Item Status — color exceptions (DRAFT uses default)
    ACTIVE:     "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
    COMPLETED:  "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
    // Priority — color exceptions (LOW uses default)
    MEDIUM:     "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100",
    HIGH:       "bg-red-100 text-red-800 border-red-200 hover:bg-red-100",
  }
  // ... returns Badge with appropriate variant and className
}
```

---

## Buttons

All buttons use the standard shadcn `Button` component — black/white theme.

| Button Purpose | `variant` | `size` | Icon |
|---|---|---|---|
| Primary action (create, submit, sign in) | `default` (black fill, white text) | `default` | Optional left icon |
| Cancel / secondary | `outline` (border only) | `default` | None |
| Destructive (delete, remove) | `destructive` (red — built-in exception, universally understood) | `default` | `Trash2` |
| Ghost / minor action (unstart, back) | `ghost` (no border, no fill) | `default` | None |
| Icon-only in table rows | `ghost` | `icon` | Lucide icon only |
| Loading state | same variant + `disabled` | same | `Loader2 animate-spin` replaces label |
| View toggle (kanban/table) | `ToggleGroup` + `ToggleGroupItem` (outline style) | — | `LayoutGrid` / `List` |
| Nav link (sidebar) | `ghost` | `default` | Lucide icon left |

> **`variant="destructive"`** is built into shadcn and outputs red. This is an intentional exception — red for delete/remove is a universal convention that would confuse users if removed.

---

## Dialogs & Overlays

### Standard Dialog

Used for: Create Workspace, Create/Edit Entity, Upload Document, Edit Document, Create Work Item, Edit Work Item, Create Document Type, Add Field, Create Work Item Type, Invite Member, Link Document Picker.

```
Dialog
└── DialogTrigger
DialogContent
├── DialogHeader
│   ├── DialogTitle
│   └── DialogDescription  (muted-foreground text)
├── [form body]
└── DialogFooter
    ├── Button variant="outline"  → Cancel
    └── Button variant="default"  → Submit
```

### Confirm/Destructive Dialog

For all delete and remove actions:

```
AlertDialog
└── AlertDialogTrigger
AlertDialogContent
├── AlertDialogHeader
│   ├── AlertDialogTitle   → "Are you sure?"
│   └── AlertDialogDescription
└── AlertDialogFooter
    ├── AlertDialogCancel   → "Cancel"
    └── AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            → "Delete"
```

### Multi-Step Dialog (Upload Document)

Standard `Dialog` + internal React state for step (1 / 2 / 3). Step indicator is a plain `div` with three labeled steps and a connecting line — all black/white using `text-muted-foreground` for inactive steps.

### Dropdown Menu

```
DropdownMenu
└── DropdownMenuTrigger
DropdownMenuContent
├── DropdownMenuLabel
├── DropdownMenuSeparator
└── DropdownMenuItem  → action
```

### Combobox (Searchable Select)

Used for Entity selector and Document Type selector in forms. Built from shadcn primitives:

```
Popover
├── PopoverTrigger → Button showing selected value or placeholder
└── PopoverContent
    └── Command
        ├── CommandInput placeholder="Search..."
        └── CommandList
            ├── CommandEmpty → "No results found"
            └── CommandGroup
                └── CommandItem (one per option)
```

---

## Navigation

### Sidebar Links

```tsx
<Link href={`/${workspaceId}/entities`}>
  <Button
    variant="ghost"
    className={cn(
      "w-full justify-start gap-2",
      isActive && "bg-accent"  // accent = light gray in neutral theme
    )}
  >
    <Users className="h-4 w-4" />
    Entities
  </Button>
</Link>
```

Active state uses `bg-accent` — a light gray tint from the neutral theme. No color.

### Collapsible Settings Sub-Nav

```
Collapsible
├── CollapsibleTrigger → Settings button with ChevronDown
└── CollapsibleContent
    └── Sub-links (indented, same ghost button style but smaller text)
```

### Breadcrumbs

```
Breadcrumb
└── BreadcrumbList
    ├── BreadcrumbItem → BreadcrumbLink  → workspace name
    ├── BreadcrumbSeparator
    └── BreadcrumbItem → BreadcrumbPage  → current page (bold)
```

---

## Feedback & State

| State | Component | Notes |
|---|---|---|
| Page loading (table) | `Skeleton` | Swap rows with `<Skeleton className="h-10 w-full" />` — neutral gray |
| Button loading | `Button disabled` + `Loader2 animate-spin` | |
| API error (in form) | `Alert variant="destructive"` + `AlertCircle` icon | Red — built-in shadcn exception |
| API error (full page) | Same `Alert` centered in content area + "Retry" button | |
| Empty state | Custom `EmptyState` component — centered, Lucide icon, `p` text, optional `Button` | All neutral/black-white |
| Success notification | `Toaster` (shadcn toast) — `toast({ title: "..." })` — top-right, neutral styling | |
| Expiring docs alert banner | `Alert` — **color exception**: `className="border-amber-300 bg-amber-50 text-amber-900"` with `AlertTriangle` icon | Amber required for visual urgency |

### Tooltip on Icon Buttons

```
TooltipProvider
└── Tooltip
    ├── TooltipTrigger → icon Button
    └── TooltipContent → label text
```

---

## Icons Reference

All icons from **Lucide React** — installed automatically with shadcn. Always use `h-4 w-4` sizing for consistency.

| Use Case | Icon Name |
|---|---|
| Dashboard nav | `LayoutDashboard` |
| Entities nav | `Users` |
| Documents nav | `FileText` |
| Work Items nav | `CheckSquare` |
| Settings nav | `Settings` |
| Audit Logs nav | `History` |
| Members sub-nav | `UserPlus` |
| Document Types sub-nav | `LayoutTemplate` |
| Work Item Types sub-nav | `Tag` |
| Download action | `Download` |
| Edit action | `Pencil` |
| Delete action | `Trash2` |
| Add / create | `Plus` |
| Unlink / remove | `X` |
| Upload | `Upload` |
| Warning / expiring | `AlertTriangle` |
| Success / valid | `CheckCircle2` |
| Loading spinner | `Loader2` (with `animate-spin`) |
| Chevron expand | `ChevronDown` |
| Chevron right | `ChevronRight` |
| Kanban view | `LayoutGrid` |
| Table view | `List` |
| Calendar / date | `CalendarIcon` |
| File | `File` |
| Link | `Link2` |
| Workspace | `Building2` |
| Sign out | `LogOut` |
| User avatar | `UserCircle` |
| Arrow back | `ArrowLeft` |
| Search | `Search` |
| Filter | `SlidersHorizontal` |
| Error | `AlertCircle` |
| Switch workspace | `ChevronsUpDown` |

---

## shadcn Components to Install

Run after `npx shadcn@latest init` (choose **neutral** base color, **zinc** palette):

```bash
# Core UI
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add textarea
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add switch
npx shadcn@latest add checkbox

# Layout & Structure
npx shadcn@latest add card
npx shadcn@latest add tabs
npx shadcn@latest add separator
npx shadcn@latest add collapsible
npx shadcn@latest add sheet

# Overlays & Dialogs
npx shadcn@latest add dialog
npx shadcn@latest add alert-dialog
npx shadcn@latest add popover
npx shadcn@latest add dropdown-menu
npx shadcn@latest add tooltip

# Data & Navigation
npx shadcn@latest add table
npx shadcn@latest add badge
npx shadcn@latest add breadcrumb
npx shadcn@latest add command
npx shadcn@latest add toggle-group

# Feedback
npx shadcn@latest add alert
npx shadcn@latest add skeleton
npx shadcn@latest add sonner
npx shadcn@latest add progress

# Date Picker
npx shadcn@latest add calendar
```

> **Note:** `sonner` replaces the older `toast` — it's the current shadcn-recommended toast library. Same API.

Additional npm packages:
```bash
npm install date-fns           # Date formatting (display only — no calculations)
npm install @tanstack/react-query
npm install react-hook-form zod @hookform/resolvers
npm install axios
```

### Color Exception Summary (for reference during implementation)

> **Only these Tailwind color classes are permitted outside the neutral palette:**

| Class group | Used for |
|---|---|
| `bg-green-100 text-green-800 border-green-200` | VALID status, COMPLETED status |
| `bg-amber-100 text-amber-800 border-amber-200` | EXPIRING status, MEDIUM priority, alert banner |
| `bg-red-100 text-red-800 border-red-200` | EXPIRED status, HIGH priority |
| `bg-blue-100 text-blue-800 border-blue-200` | ACTIVE status |
| `bg-amber-50 border-amber-300 text-amber-900` | Expiring documents alert banner |
| `bg-destructive` (shadcn variable) | Delete buttons, error alerts (built-in) |

Everything else in the codebase must use only: `bg-background`, `bg-muted`, `bg-accent`, `text-foreground`, `text-muted-foreground`, `border`, `border-input` — the neutral CSS variables.
