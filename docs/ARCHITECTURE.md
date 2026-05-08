# Architecture

SKAIL Platform is a Next.js App Router application backed by Supabase Auth/Postgres/RLS. The app is organized around a workspace tenant boundary. Most durable product data belongs to a workspace and carries `workspace_id`.

## High-Level View

```text
Browser
  |
  | React client components, forms, fetch()
  v
Next.js App Router
  |
  | Server Components load data with Supabase SSR client
  | Server Actions mutate data after membership checks
  | Route Handlers expose API-only surfaces
  v
Supabase
  |
  | Auth sessions, Postgres tables, RLS read policies
  v
Workspace-scoped product data

AI Builder route handlers
  |
  | Server-only GEMINI_API_KEY
  v
Gemini API
```

## Next.js App Router Structure

The `app/` directory is the route source of truth:

- `app/layout.tsx` sets metadata, fonts, global CSS, and Vercel Analytics in production.
- `app/page.tsx` is a server redirector to the user's first workspace.
- Feature pages usually load workspace context in a Server Component and pass serialized data into an interactive Client Component.
- Mutations are mostly in colocated `actions.ts` files marked with `'use server'`.
- API routes currently exist only for AI Builder under `app/api/ai-builder/*`.
- `proxy.ts` delegates to `lib/supabase/proxy.ts` for session refresh and route protection.

## Server and Client Component Strategy

Pattern used across persisted features:

1. A route-level Server Component resolves auth and workspace access.
2. Server-side query helpers in `lib/*/queries.ts` fetch Supabase data.
3. The page renders `DashboardLayout`.
4. A Client Component handles local UI state and submits server actions.

Examples:

| Route | Server data loader | Client surface | Mutations |
| --- | --- | --- | --- |
| `/databases` | `lib/properties/queries.ts` | `PropertyEngine` | `app/databases/actions.ts` |
| `/views` | `lib/views/queries.ts` | `ViewEngine` | `app/views/actions.ts` |
| `/pages` | `lib/layout/queries.ts` | `LayoutBuilder` | `app/pages/actions.ts` |
| `/settings/theme` | `lib/theme/queries.ts` | `ThemeStylingEngine` | `app/settings/theme/actions.ts` |
| `/ai-builder` | `lib/workspaces/queries.ts`, theme helpers | `AiBuilderChat` | API route handlers |

The dashboard shell components are client-side because the sidebar has collapse state and uses `usePathname`.

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

## Workspace Membership Model

The tenant model is centered on:

- `workspaces`: workspace identity, white-label fields, domain fields.
- `workspace_members`: user membership by `user_id`, `workspace_id`, `role_key`, and `status`.

Common role checks in code:

| Role logic | Location |
| --- | --- |
| Owner/admin can manage collection schema | `lib/properties/queries.ts` |
| Owner/admin can apply AI Builder changes | `lib/ai-builder/permissions.ts` |
| Owner/admin/designer/editor can manage theme layout surfaces | `lib/theme/permissions.ts` |
| Owner/admin can edit white-label settings | `app/workspaces/actions.ts` |

There is no centralized role-capabilities table yet. Role checks are currently hardcoded.

## Route Protection Model

Route protection has two layers:

1. Proxy-level redirect:
   - `lib/supabase/proxy.ts` checks auth claims.
   - Public paths are `/login`, `/signup`, and `/auth`.
   - API routes are excluded by `proxy.ts` matcher so they can return JSON errors.

2. Route/action-level validation:
   - Server pages call `getUserWorkspaces`, `getWorkspaceForUser`, or feature-specific query loaders.
   - Server actions and API routes query `workspace_members` before service-role writes.

Do not rely on proxy protection alone. Mutations must re-check membership.

## Domain Model Overview

```text
workspaces
  -> workspace_members
  -> collections
      -> collection_fields
      -> collection_records
          -> record_values
  -> views
  -> pages
      -> widgets
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

Workspaces are the primary tenant. Workspace creation uses the service role after checking the current Supabase user, creates a workspace, then creates an owner membership.

### Databases / Collections

Collections act like workspace databases. Each collection has fields and records. Record values are stored as JSON per field in `record_values`.

### Views

Views are saved configurations on top of collections. Current view types are `table`, `kanban`, `calendar`, and `dashboard`. Dashboard is treated as a placeholder view type.

### Pages / Layouts

Pages contain ordered widgets. Widgets can be static or connected to a collection or view. Duplicate modes can duplicate only layout, layout plus empty database structure, or everything including records.

### Theme + Styling

Themes and styles use safe token objects, not arbitrary CSS or JavaScript. `DashboardLayout` applies the resolved workspace theme as CSS variables through `workspaceThemeToStyle`.

### AI Builder

AI Builder sends a structured workspace context to Gemini from a backend route. Gemini returns JSON that is validated against `AI_BUILDER_JSON_CONTRACT`. Valid plans are stored as previews and only applied after confirmation.

### Templates, Agents, Automations, Portal Preview

These are currently UI placeholders or static demo surfaces. SQL exists for templates, agent templates, instances, logs, and webhook events, but the visible routes do not yet load those tables.

## Static/Mock vs Persisted Data

| Area | Data source | Status |
| --- | --- | --- |
| Workspaces | Supabase | Implemented |
| Workspace dashboard counts | Supabase | Implemented |
| Databases/records | Supabase | Implemented/partial |
| Views | Supabase | Implemented/partial |
| Pages/widgets | Supabase | Implemented/partial |
| Theme/style | Supabase | Implemented/partial |
| AI Builder previews | Supabase + Gemini | Implemented/partial |
| Templates route | Hardcoded array in route | Placeholder |
| Agents route | `lib/data.ts` static agents | Placeholder |
| Automations route | Hardcoded array in route | Placeholder |
| Portal preview | `lib/data.ts` static activity/checklist | Mock |
| `lib/data.ts` collections/widgets | Static legacy/demo data | Mostly not used by persisted engines |

## System Boundaries and Future Integrations

Planned but not implemented:

- n8n signed webhook receiver.
- Google Drive picker/API integration.
- Email provider integration.
- Real template installer backed by `templates`.
- Agent execution, managed/internal visibility controls, and agent activity logs.
- Role capabilities table or richer RBAC model.
- Client-facing portal routing backed by workspace pages.

## Architecture Rules To Preserve

- Every tenant-owned table needs `workspace_id`.
- Do not expose service role, Gemini, n8n, email, encryption, or signing secrets to the browser.
- Validate membership before service-role writes.
- Use structured JSON for AI actions.
- Store AI previews before applying.
- Treat destructive changes as preview/confirmation flows.
- Keep static placeholders clearly labeled until they are backed by Supabase.
