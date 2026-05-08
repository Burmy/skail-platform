# Route Inventory

Status labels:

- Working: main flow is implemented against current data sources.
- Partial: implemented but limited or missing expected production behavior.
- Placeholder: static/mock UI or non-functional controls.
- Unknown: not verified deeply.

## App Routes

| URL | File | Purpose | Behavior | Data dependencies | Auth/workspace | Related components | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | `app/page.tsx` | Default app entry. | Server Component redirects to the first user workspace or `/workspaces/new`. | `getUserWorkspaces()` -> `workspace_members`, `workspaces`. | Requires auth through query helper/proxy. | None. | Working |
| `/login` | `app/login/page.tsx` | Login page. | Server Component redirects authenticated users; renders centered auth card. | Supabase SSR `getUser()`. | Public route. | `AuthForm`. | Working |
| `/signup` | `app/signup/page.tsx` | Signup page. | Server Component redirects authenticated users; renders centered auth card. | Supabase SSR `getUser()`. | Public route. | `AuthForm`. | Working |
| `/auth/callback` | `app/auth/callback/route.ts` | Supabase auth callback. | Route Handler exchanges auth code for session and redirects to safe `next` path. | Supabase Auth code exchange. | Public route. | None. | Working |
| `/workspaces/new` | `app/workspaces/new/page.tsx` | Create first or additional tenant workspace. | Server Component renders create form and existing workspace list. | `getUserWorkspaces()`. | Requires auth. | `WorkspaceCreateForm`. | Working |
| `/workspaces/[workspaceId]` | `app/workspaces/[workspaceId]/page.tsx` | Workspace dashboard. | Server Component validates membership, loads overview and applied theme. | `workspaces`, `workspace_members`, counts from collections/pages/views/agents/members. | Requires active membership. | `DashboardLayout`, `WorkspaceDashboard`. | Working |
| `/workspaces/[workspaceId]/settings` | `app/workspaces/[workspaceId]/settings/page.tsx` | Workspace white-label settings. | Server Component validates membership and renders settings form. | `workspaces`, `workspace_members`, applied theme. | Requires active membership; updates require owner/admin. | `DashboardLayout`, `WhiteLabelSettingsForm`. | Working |
| `/pages` | `app/pages/page.tsx` | Page/tab/layout builder. | Server Component resolves `workspace_id`, loads pages, widgets, collections, views, styles, and renders builder. | `pages`, `widgets`, `collections`, `collection_fields`, `collection_records`, `record_values`, `views`, `page_style_settings`, `widget_style_settings`. | Requires active workspace membership. | `DashboardLayout`, `LayoutBuilder`. | Working/partial |
| `/databases` | `app/databases/page.tsx` | Collection/property/record engine. | Server Component resolves `workspace_id`, loads collections/fields/records, renders engine. | `collections`, `collection_fields`, `collection_records`, `record_values`. | Requires active workspace membership. Schema writes require owner/admin in actions. | `DashboardLayout`, `PropertyEngine`. | Working/partial |
| `/views` | `app/views/page.tsx` | Saved view engine. | Server Component resolves `workspace_id`, loads collections and saved views. | Collection data plus `views`. | Requires active workspace membership. | `DashboardLayout`, `ViewEngine`. | Working/partial |
| `/templates` | `app/templates/page.tsx` | Template gallery. | Client Component renders hardcoded template cards. Buttons are not connected to installer logic. | Static `templates` array in route. | Protected by proxy, but no workspace context is passed to `DashboardLayout`. | `DashboardLayout`, UI cards. | Placeholder |
| `/ai-builder` | `app/ai-builder/page.tsx` | AI Builder chat and preview flow. | Server Component resolves `workspace_id`, validates membership, renders chat. | Workspace context from layout builder data; applied theme. | Requires active membership. Apply/undo require owner/admin. | `DashboardLayout`, `AiBuilderChat`. | Working/partial |
| `/agents` | `app/agents/page.tsx` | Agent library UI. | Client Component renders static agent list and editable instruction UI. | `lib/data.ts` static `agents`. | Protected by proxy; no Supabase-backed agent loading. | `DashboardLayout`, UI cards/forms. | Placeholder |
| `/automations` | `app/automations/page.tsx` | Automation dashboard UI. | Client Component renders static automation rows and switches. | Static `automations` array in route. | Protected by proxy; no persisted automation data. | `DashboardLayout`, UI cards. | Placeholder |
| `/settings` | `app/settings/page.tsx` | Settings redirect. | Server Component redirects to first workspace settings or workspace creation. | `getUserWorkspaces()`. | Requires auth. | None. | Working |
| `/settings/theme` | `app/settings/theme/page.tsx` | Theme + Styling engine. | Server Component resolves `workspace_id`, loads theme/layout/style data, renders engine. | `themes`, `page_style_settings`, `widget_style_settings`, `view_style_settings`, plus pages/widgets/views. | Requires active membership. Shared edits require layout/workspace permissions. | `DashboardLayout`, `ThemeStylingEngine`. | Working/partial |
| `/portal-preview` | `app/portal-preview/page.tsx` | Demo client portal preview. | Client Component renders static Acme-style portal mock. | `lib/data.ts` static activity/checklist. | Protected by proxy; not workspace-backed. | UI cards/buttons. | Placeholder/mock |

## Server Actions

| File | Export | Purpose | Tables touched |
| --- | --- | --- | --- |
| `app/auth/actions.ts` | `login` | Password login. | Supabase Auth only. |
| `app/auth/actions.ts` | `signup` | Create user, optionally auto-confirm with service role, then sign in. | Supabase Auth only. |
| `app/auth/actions.ts` | `signOut` | Logout and redirect to `/login`. | Supabase Auth only. |
| `app/workspaces/actions.ts` | `createWorkspace` | Create workspace and owner membership. | `workspaces`, `workspace_members`. |
| `app/workspaces/actions.ts` | `updateWorkspaceSettings` | Save Level 2 white-label fields. | `workspace_members`, `workspaces`. |
| `app/databases/actions.ts` | `createCollection` | Create collection and default system fields. | `collections`, `collection_fields`. |
| `app/databases/actions.ts` | `renameCollection` | Rename collection. | `collections`. |
| `app/databases/actions.ts` | `createField` | Add collection field/property. | `collection_fields`. |
| `app/databases/actions.ts` | `updateField` | Rename/update field type, semantic role, required flag. | `collection_fields`. |
| `app/databases/actions.ts` | `addFieldOption` | Add option for select/status/multi-select fields. | `collection_fields`. |
| `app/databases/actions.ts` | `createRecord` | Create record and field values. | `collection_records`, `record_values`. |
| `app/databases/actions.ts` | `updateRecord` | Update record title and values. | `collection_records`, `record_values`. |
| `app/views/actions.ts` | `createView` | Create saved view. | `collections`, `collection_fields`, `views`. |
| `app/views/actions.ts` | `renameView` | Rename saved view. | `views`. |
| `app/views/actions.ts` | `duplicateView` | Copy saved view config. | `views`. |
| `app/views/actions.ts` | `updateViewSettings` | Change view type, visible fields, filters, sorts, kanban/calendar config. | `views`, `collection_fields`. |
| `app/pages/actions.ts` | `createPage` | Create page/tab. | `pages`. |
| `app/pages/actions.ts` | `renamePage` | Rename page/tab. | `pages`. |
| `app/pages/actions.ts` | `duplicatePage` | Duplicate layout/database structure/records depending on mode. | `pages`, `widgets`, `collections`, `collection_fields`, `collection_records`, `record_values`, `views`. |
| `app/pages/actions.ts` | `addWidget` | Add widget to page. | `widgets`, plus source validation in `collections`/`views`. |
| `app/pages/actions.ts` | `updateWidget` | Update widget title/source/config. | `widgets`. |
| `app/pages/actions.ts` | `reorderWidget` | Move widget up/down by swapping positions. | `widgets`. |
| `app/settings/theme/actions.ts` | `updateThemeSettings` | Save shared or personal theme tokens. | `themes`. |
| `app/settings/theme/actions.ts` | `updatePageStyleSettings` | Save page style and rename/icon data. | `pages`, `page_style_settings`. |
| `app/settings/theme/actions.ts` | `updateWidgetStyleSettings` | Save widget style tokens. | `widget_style_settings`. |
| `app/settings/theme/actions.ts` | `updateViewStyleSettings` | Save view style tokens. | `view_style_settings`. |

## API Routes

| URL | File | Method | Purpose | Auth/workspace | Status |
| --- | --- | --- | --- | --- | --- |
| `/api/ai-builder/chat` | `app/api/ai-builder/chat/route.ts` | POST | Validate prompt, load workspace context, call Gemini, validate plan, store preview. | Active workspace membership. | Working/partial |
| `/api/ai-builder/apply` | `app/api/ai-builder/apply/route.ts` | POST | Apply a stored preview. | Active membership plus owner/admin apply permission. | Working/partial |
| `/api/ai-builder/undo` | `app/api/ai-builder/undo/route.ts` | POST | Undo latest or specified applied AI preview operations. | Active membership plus owner/admin; only own applied preview can be undone. | Working/partial |

## Notes

- `/templates`, `/agents`, `/automations`, and `/portal-preview` are Client Components and currently do not resolve workspace-specific data.
- The sidebar scopes most dashboard links with `workspace_id` query params through `AppSidebar`.
- API routes are excluded from proxy redirects so they can return JSON status codes.
- There is no n8n webhook route yet.
