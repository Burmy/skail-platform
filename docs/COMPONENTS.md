# Components

This document maps the main component layer and current UI responsibilities.

## Folder Map

| Path | Purpose |
| --- | --- |
| `components/dashboard-layout.tsx` | Main shell chrome: sidebar, top bar, theme variables, mobile nav. |
| `components/workspace-shell.tsx` | Client wrapper that keeps workspace shell data stable across app route changes. |
| `components/app-sidebar.tsx` | Workspace/page/app sidebar navigation. |
| `components/auth/` | Login/signup form. |
| `components/workspaces/` | Workspace creation, dashboard, white-label settings. |
| `components/pages/` | Page home, BlockNote editor, page shell/header, sharing, portal layout, source picker. |
| `components/pages/blocks/` | SKAIL BlockNote custom blocks for databases, forms, links, bookmarks, embeds, and mentions. |
| `components/databases/` | Database shell, toolbar, tabs, field cells, property menus, archive drawer, optimistic hooks. |
| `components/databases/views/` | Table, kanban, calendar, gallery, list, timeline, map, chart, dashboard, form views. |
| `components/theme/` | Theme and style engine. |
| `components/ai-builder/` | AI Builder chat and preview UI. |
| `components/ui/` | shadcn/Radix UI primitives. |

## App Shell

### `WorkspaceShell`

File: `components/workspace-shell.tsx`

Purpose:

- Wraps workspace routes from `app/(workspace)/layout.tsx`.
- Fetches `/api/workspaces/shell`.
- Caches user email, active workspace, workspace list, and applied theme.
- Keeps the shell mounted while route content changes.
- Falls through for shared `/p/[pageId]` users who do not have workspace membership.

Important behavior:

- Uses `?workspace_id=`, `/workspaces/[workspaceId]`, and `localStorage.skail:lastWorkspaceId` to resolve active workspace.
- Renders a lightweight shell loading state only when no cached data exists.

### `DashboardLayout`

File: `components/dashboard-layout.tsx`

Purpose:

- Renders authenticated app chrome.
- Applies workspace theme tokens as CSS variables.
- Renders `AppSidebar`, top header, theme toggle/help/notification controls, mobile drawer, and route content area.

Used by:

- `WorkspaceShell` for all workspace app routes.

### `AppSidebar`

File: `components/app-sidebar.tsx`

Purpose:

- Main workspace navigation.
- Shows Home, page navigation, collapsible app links, fixed New Page/profile area, and sign-out.
- Loads Notion-like page/stacks navigation through `SidebarPagesSection`.
- Scopes app links with the active `workspace_id`.

Notes:

- Search was removed from the visible sidebar.
- Home resolves to `/workspaces/[workspaceId]`, not `/pages`.
- Page navigation scrolls independently from the bottom actions/profile area.

## Auth Components

### `AuthForm`

File: `components/auth/auth-form.tsx`

Purpose:

- Shared login/signup form.
- Uses `useActionState` to submit `login` or `signup` server actions.
- Handles email, password, show/hide password, server messages, and login/signup links.

Used by:

- `/login`
- `/signup`

## Workspace Components

### `WorkspaceCreateForm`

File: `components/workspaces/workspace-create-form.tsx`

Creates a workspace with optional portal subdomain through `createWorkspace`.

### `WorkspaceDashboard`

File: `components/workspaces/workspace-dashboard.tsx`

Shows workspace stats, recent collections, member count, and white-label status.

### `WhiteLabelSettingsForm`

File: `components/workspaces/white-label-settings-form.tsx`

Edits Level 2 white-label settings and submits to `updateWorkspaceSettings`.

## Page Components

### `PagesHome`

File: `components/pages/pages-home.tsx`

Purpose:

- Pages landing surface for a workspace.
- Shows recents, stacks, and creation actions.

Data:

- `getRecentPages`
- `getStackTree`

### `SidebarPagesSection`

File: `components/pages/sidebar-pages-section.tsx`

Purpose:

- Sidebar page tree for Recents, Stacks, and page rows.
- Supports collapsed sections, page row menus, stack/page actions, and share entry points.

### `PageShell`

File: `components/pages/page-shell.tsx`

Purpose:

- Page runtime wrapper around the header/editor.
- Provides page runtime context for workspace/shared/public modes.
- Supplies access level, page metadata, and public token when needed.

### `PageHeader`

File: `components/pages/page-header.tsx`

Purpose:

- Editable page title/icon/cover controls.
- Share dialog entry.
- Access-aware controls for workspace and shared users.

### `PageEditor`

File: `components/pages/page-editor.tsx`

Purpose:

- BlockNote editor surface.
- Saves page documents to `page_documents`.
- Registers SKAIL custom slash menu blocks.
- Handles link paste options and page/database custom blocks.

### `PortalLayout`

File: `components/pages/portal-layout.tsx`

Purpose:

- Simplified shell for shared signed-in users and public token viewers.
- Shows only shared page/stack navigation.
- Does not show SKAIL Apps or workspace administration.

### `ShareDialog`

File: `components/pages/share-dialog.tsx`

Purpose:

- Creates invite/public links.
- Shows accepted people with access.
- Allows permission change/revoke where current user has manage access.

## Page Block Components

### `EmbeddedDatabase`

File: `components/pages/blocks/embedded-database.tsx`

Purpose:

- Loads exact collection/view source for database blocks through `/api/pages/databases/shell`.
- Caches embedded database shell data by workspace/page/collection/view/public token.
- Reuses in-flight requests to avoid remount/refetch storms.
- Passes local page-specific view overrides to `DatabaseShell`.

### `DatabaseViewBlock`

File: `components/pages/blocks/database-view-block.tsx`

Purpose:

- BlockNote custom block wrapper for embedded database views.
- Stores source metadata and override JSON in the page document.
- Isolates embedded database pointer/click events from the editor.

### Link Blocks

Files:

- `web-mention-block.tsx`
- `web-bookmark-block.tsx`
- `web-embed-block.tsx`
- `page-link-block.tsx`

Purpose:

- Render pasted links as mention/bookmark/embed/page-link style blocks.
- Use server-side link preview data where needed.

## Database Components

### `DatabaseShell`

File: `components/databases/database-shell.tsx`

Purpose:

- Main database workspace for standalone and embedded modes.
- Owns active view, records, optimistic state, archive drawer, record sheet, and view overrides.
- Suppresses full route refresh for embedded normal interactions.
- Keeps embedded record sheet open state stable by page/collection/view key.

### `DatabaseToolbar`

File: `components/databases/database-toolbar.tsx`

Purpose:

- Filter, advanced filter, sort, property visibility, search, archive, source switcher, and New controls.
- In embedded mode, source/view switcher sits near New and displays actual collection/view names.
- Does not duplicate full layout/view settings.

### `RecordSideSheet`

File: `components/databases/record-side-sheet.tsx`

Purpose:

- Right-side record editor.
- Updates field/title state optimistically.
- Includes accessible `SheetTitle`.

### `FieldCell` and Field Editors

Files:

- `components/databases/field-cell.tsx`
- `components/databases/field-editors/*`

Purpose:

- Inline field rendering and editing for table/cards/sheets.
- Includes file, formula, location, person, and relation editor surfaces where implemented.

### Database Views

Folder: `components/databases/views/`

Important components:

- `database-table-view.tsx`: table rows/cells and inline editing.
- `kanban-view.tsx`: status/select/person grouping and drag interactions.
- `calendar-view.tsx`: date-based calendar rendering.
- `gallery-view.tsx`: gallery cards, cover setup, upload/URL cover image behavior.
- `form-view.tsx` and `public-form-view.tsx`: database form configuration and public submission.
- `dashboard-view.tsx`: dashboard-style placeholder/config surface.

## Theme Components

### `ThemeStylingEngine`

File: `components/theme/theme-styling-engine.tsx`

Purpose:

- Workspace theme, page styles, widget styles, view styles, and AI schema.
- Uses safe tokens and hex color fields.
- Shows contrast warnings.
- Supports shared and personal theme save targets.
- Includes reset-to-default token behavior.

### `ThemeProvider` and `ThemeModeToggle`

Files:

- `components/theme-provider.tsx`
- `components/theme-mode-toggle.tsx`

Purpose:

- Provide light/dark/system behavior through `next-themes`.
- Toggle visible theme mode in the app chrome.

## AI Builder Components

### `AiBuilderChat`

File: `components/ai-builder/ai-builder-chat.tsx`

Purpose:

- Chat UI for AI Builder prompts.
- Suggested prompts.
- Preview changes panel grouped by change type.
- Apply changes button.
- Undo last change button.
- Copy JSON and regenerate controls.

API dependencies:

- `POST /api/ai-builder/chat`
- `POST /api/ai-builder/apply`
- `POST /api/ai-builder/undo`

The frontend never calls Gemini directly.

## Shared UI Components

`components/ui/` contains shadcn/Radix primitives such as buttons, cards, dialogs, dropdowns, popovers, sheets, forms, inputs, tables, tabs, toasts, and tooltips.

Use these primitives before creating new low-level UI. Keep product-specific logic outside `components/ui/`.

## Static Placeholder Route Components

| Area | File | Current state |
| --- | --- | --- |
| Templates | `app/(workspace)/templates/page.tsx` | Hardcoded cards; installer not connected. |
| Agents | `app/(workspace)/agents/page.tsx` | Placeholder library/instructions UI; no persisted agent execution. |
| Automations | `app/(workspace)/automations/page.tsx` | Static automation rows; no n8n wiring. |
| Portal preview | `app/(workspace)/portal-preview/page.tsx` | Static mock; not real published portal rendering. |

## Component Guidelines

- Keep route data loading in Server Components and `lib/*/queries.ts`.
- Keep local interactivity in Client Components.
- Keep mutations in server actions or route handlers.
- Pass only serializable data into Client Components.
- Prefer existing shadcn/ui primitives.
- Preserve workspace scoping and permission checks when adding UI.
- For embedded page databases, prefer local optimistic updates and background sync over `router.refresh()`.
