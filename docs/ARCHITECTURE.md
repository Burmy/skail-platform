# Architecture

SKAIL Platform is a Next.js App Router application backed by Supabase Auth/Postgres/RLS. The app is organized around a workspace tenant boundary, with page/stack sharing layered on top for portal-style access.

## High-Level View

```text
Browser
  |
  | React client components, forms, fetch()
  v
Next.js App Router
  |
  | Server Components load workspace/page/database data
  | Client shell keeps sidebar/header mounted across workspace routes
  | Server Actions mutate after workspace or page-access checks
  | Route Handlers expose AI, file, page-source, public-form, and shell APIs
  v
Supabase
  |
  | Auth sessions, Postgres tables, RLS read/share policies
  v
Workspace-scoped product data

AI Builder route handlers
  |
  | Server-only GEMINI_API_KEY
  v
Gemini API
```

## Next.js App Router Structure

- `app/layout.tsx` sets metadata, fonts, global CSS, theme provider, and Vercel Analytics in production.
- `app/page.tsx` redirects to the user's first workspace or `/workspaces/new`.
- `app/(workspace)/layout.tsx` wraps authenticated workspace app routes in `WorkspaceShell`. The route group does not change public URLs.
- `components/workspace-shell.tsx` fetches `/api/workspaces/shell`, caches workspace shell data, and renders `DashboardLayout`.
- `app/(workspace)/...` contains dashboard, pages, page editor, databases, theme, AI Builder, templates, agents, automations, and portal preview routes.
- Public/share routes remain outside the workspace shell: `/login`, `/signup`, `/auth/callback`, `/share/[token]`, `/invite/[token]`, and `/f/[slug]`.
- Mutations are mostly in colocated `actions.ts` files marked with `'use server'`.
- API routes are under `app/api/*` and return JSON rather than relying on browser redirects.
- `proxy.ts` delegates to `lib/supabase/proxy.ts` for session refresh and route protection.

## Persistent Workspace Shell

`WorkspaceShell` is a client shell for the main app. It keeps the sidebar/header mounted while route content changes, which avoids the old full-shell reload feeling on navigation.

Data loaded by `/api/workspaces/shell`:

- current user email
- active workspace
- all user workspaces
- applied workspace theme

Resolution rules:

- `?workspace_id=` wins when present.
- `/workspaces/[workspaceId]` route params are used for dashboard/settings.
- Otherwise the shell falls back to `localStorage.skail:lastWorkspaceId`.

If a shared user opens `/p/[pageId]` without workspace membership, the shell receives a 403 and passes through so the page route can render the simplified portal shell.

## Server and Client Component Strategy

Common pattern:

1. A route-level Server Component resolves auth and workspace/page access.
2. Query helpers in `lib/*/queries.ts` fetch Supabase data.
3. The route renders a focused Client Component inside the persistent shell.
4. Mutations use server actions or JSON route handlers.
5. Normal interactive edits update local state first and refresh in the background only when needed.

Examples:

| Surface | Server data loader | Client surface | Mutations |
| --- | --- | --- | --- |
| Workspace dashboard | `lib/workspaces/queries.ts` | `WorkspaceDashboard` | `app/workspaces/actions.ts` |
| Databases | `lib/databases/queries.ts` | `DatabaseShell` | `app/databases/actions.ts` |
| Pages home | `lib/pages/queries.ts` | `PagesHome` | `app/pages/actions.ts` |
| Page editor | `lib/pages/access.ts`, `lib/pages/queries.ts` | `PageShell`, `PageEditor` | `app/pages/actions.ts`, `app/pages/share-actions.ts` |
| Theme | `lib/theme/queries.ts` | `ThemeStylingEngine` | `app/settings/theme/actions.ts` |
| AI Builder | workspace/theme query helpers | `AiBuilderChat` | `app/api/ai-builder/*` |

## Supabase Architecture

Supabase clients:

| File | Purpose |
| --- | --- |
| `lib/supabase/client.ts` | Browser client using the public Supabase key. |
| `lib/supabase/server.ts` | Request-aware SSR client using cookies. |
| `lib/supabase/proxy.ts` | Middleware/proxy client that refreshes auth and redirects unauthenticated users. |
| `lib/supabase/admin.ts` | Server-only service role client for trusted writes. |
| `lib/supabase/auth.ts` | Stateless public auth client used for signup fallback. |
| `lib/supabase/env.ts` | Environment validation helpers. |
| `lib/supabase/cookie-config.ts` | Shared auth cookie name and legacy cookie cleanup helpers. |

The codebase uses typed table definitions in `lib/supabase/database.types.ts`.

## Auth and Session Flow

- `/login` and `/signup` are public routes.
- `app/auth/actions.ts` performs login, signup, and logout.
- Login uses `supabase.auth.signInWithPassword`.
- Signup can use `auth.admin.createUser({ email_confirm: true })` when `SUPABASE_SERVICE_ROLE_KEY` is configured, then immediately signs the user in.
- If auto-confirm is disabled or admin key is absent, signup falls back to normal Supabase `signUp` with an auth callback.
- `/auth/callback` exchanges an auth code for a session and redirects to a safe `next` path.
- `proxy.ts` redirects unauthenticated non-public routes to `/login?next=...`.
- Invite links route signed-out users through login/signup and back to `/invite/[token]`.

## Workspace Membership Model

Workspaces are the full SKAIL app boundary.

- `workspaces`: workspace identity, white-label fields, domain fields.
- `workspace_members`: user membership by `user_id`, `workspace_id`, `role_key`, and `status`.

Workspace members can access the full app shell based on role. Owner/admin checks are still mostly hardcoded in TypeScript helpers and actions.

## Page and Stack Sharing Model

Page/stack sharing is separate from workspace membership.

Access levels:

- `view`: read shared page/stack content.
- `edit`: edit page title, cover/icon, BlockNote document, and records exposed through embedded database blocks.
- `manage`: edit plus manage page structure and sharing inside the granted scope.

Share scopes:

- `page`: grants access to that page and child pages.
- `stack`: grants access to current and future pages in that stack.

Tables:

- `page_share_links`: tokenized public/invite links. Only token hashes are stored.
- `page_access_grants`: accepted signed-in user access.
- `page_share_events`: audit log for sharing actions.

Public links are view-only and route through `/share/[token]`. Invite links require sign-in and route through `/invite/[token]`.

## Route Protection Model

Protection has three layers:

1. Proxy-level redirect for authenticated app routes.
2. Workspace route/query validation through `getUserWorkspaces`, `getWorkspaceForUser`, and domain query helpers.
3. Page/share validation through `lib/pages/access.ts` for `/p/[pageId]`, `/share/[token]`, `/invite/[token]`, embedded databases, and public forms.

Do not rely on proxy protection alone. Mutations must re-check workspace membership or page/share access.

## Data and Domain Model

```text
workspaces
  -> workspace_members
  -> collections
      -> collection_fields
      -> collection_records
          -> record_values
      -> views
  -> page_stacks
      -> pages
          -> page_documents
          -> page_visits
          -> page_forms
  -> page_share_links
  -> page_access_grants
  -> page_share_events
  -> themes
  -> page_style_settings
  -> widget_style_settings
  -> view_style_settings
  -> ai_builder_previews
  -> agent_instances
  -> agent_activity_logs
  -> webhook_events

templates may be platform-level or workspace-level.
agent_templates are platform-level agent definitions.
```

## Feature Boundaries

### Workspaces

Workspaces are the tenant root. Workspace creation uses the service role after checking the current Supabase user, creates a workspace, then creates an owner membership.

### Pages

Pages are BlockNote documents stored in `page_documents`. Stacks organize pages in the sidebar. Page routes support workspace mode, shared signed-in mode, and public read-only mode.

### Databases and Views

Collections act like databases. Views are saved configurations over collections and are managed inside the database app at `/databases/[collectionId]`. There is no standalone `/views` route now.

### Embedded Databases

Page database blocks reference exact collection/view identity and store local overrides on the page document. Embedded blocks fetch through `/api/pages/databases/shell`, verify that the source is actually embedded on the page, cache loaded shell data, and suppress full route refreshes for normal cell/dropdown interactions.

### Theme and Styling

Themes and styles use safe token objects, not arbitrary CSS or JavaScript. `DashboardLayout` and portal/page surfaces apply resolved workspace themes as CSS variables.

### AI Builder

AI Builder sends structured workspace context to Gemini from backend routes. Gemini returns JSON that is validated against the runtime contract, stored as a preview, and applied only after confirmation.

### Templates, Agents, Automations, Portal Preview

These are still placeholder or mock-heavy. SQL exists for templates, agents, and webhook events, but the visible routes are not fully backed by those tables.

## Static/Mock vs Persisted Data

| Area | Data source | Status |
| --- | --- | --- |
| Auth/workspaces | Supabase | Implemented |
| Workspace dashboard counts | Supabase | Implemented |
| Pages/stacks/documents/visits | Supabase | Implemented/partial |
| Page sharing | Supabase | Implemented/partial |
| Databases/records/files/forms | Supabase | Implemented/partial |
| Saved database views | Supabase | Implemented/partial |
| Theme/style | Supabase | Implemented/partial |
| AI Builder previews | Supabase + Gemini | Implemented/partial |
| Templates route | Hardcoded array | Placeholder |
| Agents route | Static/placeholder data | Placeholder |
| Automations route | Hardcoded array | Placeholder |
| Portal preview | Static mock | Mock |
| `lib/data.ts` navigation/static content | Static support data | Mixed; nav still used |

## System Boundaries and Future Integrations

Planned or incomplete:

- n8n signed webhook receiver.
- Google Drive picker/API integration.
- Email provider integration.
- Real template installer backed by `templates`.
- Agent execution, managed/internal visibility controls, and agent activity logs.
- Role capabilities table or richer RBAC model.
- More complete write RLS.

## Architecture Rules To Preserve

- Every tenant-owned table needs `workspace_id`.
- Do not expose service role, Gemini, n8n, email, encryption, or signing secrets to the browser.
- Validate workspace membership before service-role writes.
- Validate page/share access for shared/public page and embedded database operations.
- Do not mutate global saved view config from page-local embedded database controls.
- Avoid `router.refresh()` for normal embedded database interactions.
- Use structured JSON for AI actions.
- Store AI previews before applying.
- Treat destructive changes as preview/confirmation flows.
- Keep static placeholders clearly labeled until they are backed by Supabase.
