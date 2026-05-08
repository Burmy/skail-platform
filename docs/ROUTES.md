# Route Inventory

Status labels:

- Working: main flow is implemented against current data sources.
- Partial: implemented but limited or missing expected production behavior.
- Placeholder: static/mock UI or non-functional controls.
- Unknown: not verified deeply.

## App Routes

Workspace app routes live in `app/(workspace)` so they share the persistent `WorkspaceShell`. The public URL paths below are unchanged.

| URL | File | Purpose | Behavior | Data dependencies | Auth/workspace | Related components | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | `app/page.tsx` | Default app entry. | Server redirect to first user workspace or `/workspaces/new`. | `getUserWorkspaces()`. | Requires auth through query/proxy. | None. | Working |
| `/login` | `app/login/page.tsx` | Login page. | Redirects authenticated users; renders centered auth card. | Supabase SSR `getUser()`. | Public. | `AuthForm`. | Working |
| `/signup` | `app/signup/page.tsx` | Signup page. | Redirects authenticated users; renders centered auth card. | Supabase SSR `getUser()`. | Public. | `AuthForm`. | Working |
| `/auth/callback` | `app/auth/callback/route.ts` | Supabase auth callback. | Exchanges auth code for session and redirects to safe `next` path. | Supabase Auth. | Public. | None. | Working |
| `/workspaces/new` | `app/workspaces/new/page.tsx` | Workspace creation. | Renders create form and existing workspace list. | `getUserWorkspaces()`. | Requires auth. | `WorkspaceCreateForm`. | Working |
| `/workspaces/[workspaceId]` | `app/(workspace)/workspaces/[workspaceId]/page.tsx` | Workspace dashboard. | Validates membership and loads overview. | `workspaces`, `workspace_members`, counts. | Active membership. | `WorkspaceShell`, `WorkspaceDashboard`. | Working |
| `/workspaces/[workspaceId]/settings` | `app/(workspace)/workspaces/[workspaceId]/settings/page.tsx` | White-label settings. | Validates membership and renders settings form. | `workspaces`, `workspace_members`. | Active membership; updates require owner/admin. | `WhiteLabelSettingsForm`. | Working |
| `/pages` | `app/(workspace)/pages/page.tsx` | Pages home. | Resolves workspace, loads stacks and recents. | `page_stacks`, `pages`, `page_visits`. | Active membership. | `PagesHome`. | Working/partial |
| `/pages/trash` | `app/(workspace)/pages/trash/page.tsx` | Page trash. | Loads archived pages for restore/archive cleanup flow. | `pages`. | Active membership. | `TrashView`. | Working/partial |
| `/p/[pageId]` | `app/(workspace)/p/[pageId]/page.tsx` | Page editor. | Resolves workspace/page access. Workspace members get app shell; accepted shared users get portal shell. | `pages`, `page_documents`, page sharing helpers. | Workspace membership or accepted page/stack grant. | `PageShell`, `PageEditor`, `PortalLayout`. | Working/partial |
| `/databases` | `app/(workspace)/databases/page.tsx` | Database entry. | Resolves workspace, migrates if needed, redirects to first collection or empty database state. | `collections`, `views`. | Active membership. | `DatabaseShell`. | Working/partial |
| `/databases/[collectionId]` | `app/(workspace)/databases/[collectionId]/page.tsx` | Database workspace. | Loads one collection, fields, records, views, selected view, and search. | `collections`, `collection_fields`, `collection_records`, `record_values`, `views`. | Active membership; schema writes require role checks. | `DatabaseShell`, database view components. | Working/partial |
| `/templates` | `app/(workspace)/templates/page.tsx` | Template gallery. | Renders hardcoded template cards. | Static array in route. | Protected app route. | UI cards. | Placeholder |
| `/ai-builder` | `app/(workspace)/ai-builder/page.tsx` | AI Builder chat and preview. | Validates membership, renders chat surface. | Workspace context, theme, AI previews. | Active membership; apply/undo require owner/admin. | `AiBuilderChat`. | Working/partial |
| `/agents` | `app/(workspace)/agents/page.tsx` | Agent library UI. | Renders placeholder/static agent surface. | Static/support data. | Protected app route. | UI cards/forms. | Placeholder |
| `/automations` | `app/(workspace)/automations/page.tsx` | Automation UI. | Renders static automation rows and switches. | Static array in route. | Protected app route. | UI cards. | Placeholder |
| `/settings` | `app/(workspace)/settings/page.tsx` | Settings redirect. | Redirects to first workspace settings or workspace creation. | `getUserWorkspaces()`. | Requires auth. | None. | Working |
| `/settings/theme` | `app/(workspace)/settings/theme/page.tsx` | Theme + Styling engine. | Loads theme/style data and renders editor. | `themes`, `page_style_settings`, `widget_style_settings`, `view_style_settings`, pages/widgets/views. | Active membership; shared edits require layout/workspace permissions. | `ThemeStylingEngine`. | Working/partial |
| `/portal-preview` | `app/(workspace)/portal-preview/page.tsx` | Demo portal preview. | Renders static portal mock. | Static support data. | Protected app route. | UI cards/buttons. | Placeholder/mock |
| `/share/[token]` | `app/share/[token]/page.tsx` | Public shared page/stack. | Validates public share token and renders read-only portal shell. | `page_share_links`, `pages`, `page_documents`. | Public token; no auth required. | `PortalLayout`, `PageShell`. | Working/partial |
| `/invite/[token]` | `app/invite/[token]/page.tsx` | Invite acceptance. | Validates invite token, requires sign-in, shows accept card. | `page_share_links`, Supabase Auth. | Auth required before accept. | `InviteAcceptCard`. | Working/partial |
| `/f/[slug]` | `app/f/[slug]/page.tsx` | Public database form. | Loads a public form view by slug and renders form submission UI. | `views`, collection fields. | Public form token/slug path. | `PublicFormView`. | Working/partial |

No standalone `/views` route exists now. Saved views are managed in `/databases/[collectionId]`.

## Server Actions

| File | Main exports | Purpose | Tables touched |
| --- | --- | --- | --- |
| `app/auth/actions.ts` | `login`, `signup`, `signOut` | Supabase password auth, optional auto-confirm signup, logout. | Supabase Auth |
| `app/workspaces/actions.ts` | `createWorkspace`, `updateWorkspaceSettings` | Create workspaces and update white-label settings. | `workspaces`, `workspace_members` |
| `app/databases/actions.ts` | collection/field/record/view/archive/form actions | Database schema, records, saved views, archive/restore, public form config, embedded DB permission checks. | `collections`, `collection_fields`, `collection_records`, `record_values`, `views`, file tables where present |
| `app/pages/actions.ts` | page/stack/document/trash actions | Create/rename/archive/restore pages and stacks; save BlockNote documents; update icons/covers; record page visits. | `page_stacks`, `pages`, `page_documents`, `page_visits` |
| `app/pages/share-actions.ts` | link/grant/share actions | Create/revoke share links, accept invites, change/revoke access. | `page_share_links`, `page_access_grants`, `page_share_events` |
| `app/settings/theme/actions.ts` | theme/page/widget/view style actions | Save shared/personal theme and safe style tokens. | `themes`, `page_style_settings`, `widget_style_settings`, `view_style_settings` |

## API Routes

| URL | File | Method | Purpose | Auth/workspace | Status |
| --- | --- | --- | --- | --- | --- |
| `/api/workspaces/shell` | `app/api/workspaces/shell/route.ts` | GET | Load persistent shell user/workspace/theme context. | Active membership; returns 403 for inaccessible workspace/page passthrough. | Working |
| `/api/ai-builder/chat` | `app/api/ai-builder/chat/route.ts` | POST | Load context, call Gemini, validate plan, store preview. | Active workspace membership. | Working/partial |
| `/api/ai-builder/apply` | `app/api/ai-builder/apply/route.ts` | POST | Apply a stored AI preview. | Active membership plus owner/admin apply permission. | Working/partial |
| `/api/ai-builder/undo` | `app/api/ai-builder/undo/route.ts` | POST | Undo latest or specified applied AI operations. | Active membership plus owner/admin. | Working/partial |
| `/api/pages/databases/shell` | `app/api/pages/databases/shell/route.ts` | GET | Load database shell data for embedded page database blocks after verifying the source is embedded on the page. | Workspace, shared, or public page access. | Working/partial |
| `/api/pages/sources` | `app/api/pages/sources/route.ts` | GET | List page-selectable database sources/views. | Workspace/page access. | Working/partial |
| `/api/pages/sources/preview` | `app/api/pages/sources/preview/route.ts` | GET | Preview source metadata for page blocks. | Workspace/page access. | Working/partial |
| `/api/pages/info` | `app/api/pages/info/route.ts` | GET | Resolve page metadata for editor/link helpers. | Workspace/page access. | Working/partial |
| `/api/pages/nav` | `app/api/pages/nav/route.ts` | GET | Load page sidebar navigation data. | Workspace/page access. | Working/partial |
| `/api/pages/link-preview` | `app/api/pages/link-preview/route.ts` | POST/GET | Server-side URL metadata preview for bookmark/embed choices. | Backend fetch with sanitization; no secrets. | Working/partial |
| `/api/pages/assets/sign` | `app/api/pages/assets/sign/route.ts` | POST | Sign page asset upload/read requests. | Page access. | Working/partial |
| `/api/pages/assets/upload` | `app/api/pages/assets/upload/route.ts` | POST | Upload page assets. | Page access. | Working/partial |
| `/api/pages/forms/[formId]` | `app/api/pages/forms/[formId]/route.ts` | GET/POST | Page form metadata/submission endpoint. | Page/public token validation depending route. | Working/partial |
| `/api/forms/submit` | `app/api/forms/submit/route.ts` | POST | Public database form submission. | Public form view validation. | Working/partial |
| `/api/databases/archive` | `app/api/databases/archive/route.ts` | GET | Load archived database items for archive drawer. | Active workspace membership. | Working/partial |
| `/api/databases/files/upload` | `app/api/databases/files/upload/route.ts` | POST | Upload database file values. | Active membership or embedded page access path. | Working/partial |
| `/api/databases/files/list` | `app/api/databases/files/list/route.ts` | GET | List/signed URLs for database file values. | Active membership/page access. | Working/partial |
| `/api/databases/files/[fileId]` | `app/api/databases/files/[fileId]/route.ts` | GET/DELETE | File retrieval/deletion helper. | Active membership/page access. | Working/partial |
| `/api/databases/geocode` | `app/api/databases/geocode/route.ts` | GET | Geocode helper for map/location views. | Active membership. | Partial |
| `/api/databases/members` | `app/api/databases/members/route.ts` | GET | Workspace member lookup for person fields. | Active membership. | Working/partial |
| `/api/databases/relations` | `app/api/databases/relations/route.ts` | GET | Relation lookup helper. | Active membership. | Working/partial |

## Notes

- The sidebar scopes most app links with `workspace_id` query params through `AppSidebar`.
- API routes are excluded from proxy redirects so they can return JSON status codes.
- Page/public/shared access must use `lib/pages/access.ts` helpers, not just workspace membership checks.
- There is no n8n webhook route yet.
