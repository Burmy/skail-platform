# Components

This document maps the component layer and the main UI responsibilities.

## Folder Map

| Path | Purpose |
| --- | --- |
| `components/dashboard-layout.tsx` | Main authenticated app shell. |
| `components/app-sidebar.tsx` | Workspace-aware sidebar navigation. |
| `components/auth/` | Login/signup form. |
| `components/workspaces/` | Workspace creation, dashboard, white-label settings. |
| `components/properties/` | Database/collection/property/record engine. |
| `components/views/` | Saved view engine. |
| `components/layout-builder/` | Page/tab/widget layout builder. |
| `components/theme/` | Theme and style engine. |
| `components/ai-builder/` | AI Builder chat and preview UI. |
| `components/ui/` | shadcn/Radix UI primitives. |

## App Shell

### `DashboardLayout`

File: `components/dashboard-layout.tsx`

Purpose:

- Wraps authenticated dashboard pages.
- Applies workspace theme tokens as CSS variables through `workspaceThemeToStyle`.
- Renders `AppSidebar`, top header, optional page title/description/actions, and scrollable content.

Inputs:

- `children`
- `title`, `description`, `actions`
- `workspace`, `workspaces`, `userEmail`
- `theme`

Used by:

- Workspace dashboard
- Databases
- Views
- Pages
- Theme settings
- AI Builder
- Placeholder routes such as templates, agents, automations

### `AppSidebar`

File: `components/app-sidebar.tsx`

Purpose:

- Main workspace navigation.
- Uses `lib/data.ts` `navItems`.
- Scopes links with the active `workspace_id` query parameter.
- Shows workspace branding and user email.
- Includes collapse state and sign-out form.

Inputs:

- `workspace`
- `workspaces`
- `userEmail`

Notes:

- Search UI is visual only.
- Workspace switcher appears only when more than one workspace is passed.

## Auth Components

### `AuthForm`

File: `components/auth/auth-form.tsx`

Purpose:

- Shared login/signup form.
- Uses `useActionState` to submit `login` or `signup` server actions.
- Handles email, password, show/hide password, server messages, and login/signup links.

Inputs:

- `mode`: `login` or `signup`
- `nextPath`
- `message`

Used by:

- `/login`
- `/signup`

## Workspace Components

### `WorkspaceCreateForm`

File: `components/workspaces/workspace-create-form.tsx`

Purpose:

- Creates a workspace with optional portal subdomain.
- Submits to `createWorkspace`.

Data:

- Writes `workspaces` and owner `workspace_members` through the server action.

### `WhiteLabelSettingsForm`

File: `components/workspaces/white-label-settings-form.tsx`

Purpose:

- Edits Level 2 white-label settings: workspace name, level, brand name/logo, accent color, SKAIL branding toggle, subdomain, custom domain, and email identity.
- Submits to `updateWorkspaceSettings`.

Inputs:

- `workspace`

### `WorkspaceDashboard`

File: `components/workspaces/workspace-dashboard.tsx`

Purpose:

- Shows workspace stats, recent collections, member count, and white-label status.

Inputs:

- `workspace`
- `overview`
- `roleKey`

Data:

- Reads overview data from `lib/workspaces/queries.ts`.

## Database / Property Components

### `PropertyEngine`

File: `components/properties/property-engine.tsx`

Purpose:

- Collection/property/record management UI.
- Allows creating and renaming collections.
- Allows creating fields, editing fields, changing field type with confirmation, adding select/status/multi-select options.
- Allows basic record create/update forms.
- Hides system fields depending on permissions.

Inputs:

- `workspaceId`
- `collections`
- `canManageSchema`
- `canSeeSystemFields`

Server actions:

- `createCollection`
- `renameCollection`
- `createField`
- `updateField`
- `addFieldOption`
- `createRecord`
- `updateRecord`

Notes:

- File/person/relation/formula types are present as V1 placeholders; storage or relationship behavior is not fully implemented.

## View Components

### `ViewEngine`

File: `components/views/view-engine.tsx`

Purpose:

- Saved view management UI.
- Create, rename, duplicate, and update views.
- Configure visible fields, filters, sorts, kanban group field, and calendar date field.
- Renders table, kanban, calendar, and dashboard-placeholder previews from loaded records.

Inputs:

- `workspaceId`
- `collections`
- `views`

Server actions:

- `createView`
- `renameView`
- `duplicateView`
- `updateViewSettings`

Notes:

- Guided setup is implemented through validation/errors when kanban/calendar requirements are not met.
- Dashboard view type exists but is not a full dashboard builder.

## Layout Builder Components

### `LayoutBuilder`

File: `components/layout-builder/layout-builder.tsx`

Purpose:

- Page/tab/widget builder UI.
- Creates, renames, duplicates pages.
- Adds, updates, and reorders widgets.
- Connects widgets to collections or views.
- Renders lightweight previews for widget types.
- Applies page/widget style data if present.

Inputs:

- `workspaceId`
- `pages`
- `collections`
- `views`

Server actions:

- `createPage`
- `renamePage`
- `duplicatePage`
- `addWidget`
- `updateWidget`
- `reorderWidget`

Duplicate modes:

- `layout_only`
- `layout_with_empty_database`
- `everything`

## Theme Components

### `ThemeStylingEngine`

File: `components/theme/theme-styling-engine.tsx`

Purpose:

- Theme and style editor with sections for workspace theme, page styles, widget styles, view styles, and AI schema.
- Uses safe token choices and hex color fields.
- Shows contrast warnings.
- Handles shared vs personal theme save target.

Inputs:

- `workspaceId`
- `initialSection`
- `sharedTheme`, `personalTheme`, `fallbackThemeTokens`
- `pages`, `views`
- `pageStyles`, `widgetStyles`, `viewStyles`
- `permissions`

Server actions:

- `updateThemeSettings`
- `updatePageStyleSettings`
- `updateWidgetStyleSettings`
- `updateViewStyleSettings`

Notes:

- Does not allow arbitrary CSS or custom JavaScript.
- AI schema section exposes approved safe schema for future AI design changes.

### `ThemeProvider`

File: `components/theme-provider.tsx`

Purpose:

- Thin `next-themes` provider wrapper.

Current use:

- Present in repo but not wired into `app/layout.tsx`.

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

Inputs:

- `workspaceId`
- `canApply`
- `userEmail`

API dependencies:

- `POST /api/ai-builder/chat`
- `POST /api/ai-builder/apply`
- `POST /api/ai-builder/undo`

Notes:

- The frontend never calls Gemini directly.
- It only displays previews returned by backend routes.

## Shared UI Components

`components/ui/` contains shadcn/Radix primitives such as:

- Buttons, cards, badges, alerts, dialogs, dropdown menus, popovers.
- Forms, inputs, textareas, selects, switches, checkboxes.
- Tables, tabs, sidebars, calendars, charts, drawers, sheets.
- Toast/toaster utilities and mobile hook.

Use these primitives before creating new low-level UI. Keep product-specific logic outside `components/ui/`.

## Static Placeholder Route Components

### Templates route

File: `app/templates/page.tsx`

- Hardcoded template cards.
- Does not read `templates`.
- "Use Template" is not connected to installer behavior.

### Agents route

File: `app/agents/page.tsx`

- Uses static `agents` from `lib/data.ts`.
- Editing instructions is local UI state only.
- Does not read `agent_templates` or `agent_instances`.

### Automations route

File: `app/automations/page.tsx`

- Uses a hardcoded `automations` array.
- Switches/buttons are visual only.

### Portal preview route

File: `app/portal-preview/page.tsx`

- Static Acme-style portal mock.
- Uses `activityFeed` and `onboardingChecklist` from `lib/data.ts`.
- Not connected to actual workspace pages or white-label portal routing.

## Component Guidelines

- Keep route data loading in Server Components and `lib/*/queries.ts`.
- Keep local interactivity in Client Components.
- Keep mutations in server actions or route handlers.
- Pass only serializable data into Client Components.
- Prefer existing shadcn/ui primitives.
- Preserve workspace scoping and permission checks when adding UI.
