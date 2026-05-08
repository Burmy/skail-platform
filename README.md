# SKAIL Platform

SKAIL is a multi-tenant workspace and client-portal platform. It is being built as a Notion-like operating system for workspaces: teams can create tenant workspaces, define databases, add records, build saved views, arrange pages with widgets, style the workspace, and use an AI Builder to preview structured changes before applying them.

The current codebase is an early product foundation. Several core builder surfaces are backed by Supabase. Some higher-level product areas are still static placeholders.

## Tech Stack

| Area | Technology |
| --- | --- |
| App framework | Next.js App Router |
| Language | TypeScript |
| UI | Tailwind CSS v4, shadcn/ui, Radix UI, lucide-react |
| Auth/data | Supabase Auth, Postgres, RLS, `@supabase/ssr`, `@supabase/supabase-js` |
| AI Builder | Gemini API through backend route handlers only |
| Deployment target | Vercel |
| Analytics | Vercel Analytics in production |
| Automation integration | n8n planned via signed webhooks; no receiver is implemented yet |

## Current Product Surface

Implemented or partially implemented:

- Auth: login, signup, logout, callback route, Supabase session refresh through `proxy.ts`.
- Workspaces: create workspaces, list user workspaces, owner membership creation, workspace dashboard, Level 2 white-label settings.
- Databases/collections: create and rename collections, create/update fields, add options, create/update records.
- Views: create, rename, duplicate, and configure table/kanban/calendar/dashboard-placeholder views.
- Pages/layout builder: create, rename, duplicate pages, add/reorder/update widgets connected to collections or views.
- Theme/styling: workspace theme tokens, page styles, widget styles, view styles, personal/shared theme paths.
- AI Builder: chat UI, preview storage, Gemini structured JSON generation, apply, and undo for supported actions.
- Placeholder/static areas: templates, agents, automations, portal preview.

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and fill only local development values. Do not commit `.env`.

3. Apply the Supabase SQL files listed below.

4. Start the app:

```bash
npm run dev
```

The dev script runs Next with a larger HTTP header limit:

```bash
node --max-http-header-size=262144 ./node_modules/next/dist/bin/next dev
```

Open `http://localhost:3000`.

## Environment Variables

See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for the full inventory. Required now:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Recommended | Base app URL for auth redirects. |
| `NEXT_PUBLIC_APP_NAME` | Optional | Display name; default code is mostly hardcoded to SKAIL. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes, unless anon key is used | Browser/server public Supabase key. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Legacy fallback | Used only if publishable key is missing. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes for writes/admin flows | Server-only key used for workspace creation, writes, AI apply, and auto-confirm signup. |
| `SKAIL_AUTO_CONFIRM_SIGNUPS` | Optional | When not `false`, server signup can auto-confirm with service role and immediately sign in the user. |
| `GEMINI_API_KEY` | Required for AI Builder | Server-only Gemini API key. |
| `AI_BUILDER_MODEL` | Optional | Defaults to `gemini-2.5-flash`. |

Future/planned variables include n8n, Google Drive, email provider, and security signing/encryption keys.

## Supabase Setup

Apply SQL in this order:

1. `sql/supabase_schema_v1.sql`  
   Creates the foundation tables: workspaces, memberships, collections, fields, records, views, pages, widgets, AI Builder previews, templates, agents, and webhook events.

2. `sql/supabase_rls_v1.sql`  
   Enables RLS and adds read policies based on active workspace membership. It also creates `public.is_workspace_member`.

3. `sql/supabase_theme_styling_v1.sql`  
   Adds theme/style tables and read policies.

4. `sql/supabase_ai_builder_v1.sql`  
   Recreates or updates the AI Builder preview table and policies. It overlaps with `supabase_schema_v1.sql`; use it as the module-specific patch file.

5. `sql/seed_templates_v1.sql`  
   Seeds platform templates and agent templates.

Most mutation code validates user workspace membership in server actions or API routes, then writes with the service role client. Current RLS policies are read-focused.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start local Next dev server with increased header size. |
| `npm run build` | Production build. `next.config.mjs` currently sets `typescript.ignoreBuildErrors: true`, so run TypeScript separately when needed. |
| `npm run start` | Start production server after build. |
| `npm run lint` | Run ESLint over the repository. |

## Folder Structure

| Path | Purpose |
| --- | --- |
| `app/` | Next.js App Router routes, route handlers, server actions, global CSS, root layout. |
| `components/` | Product components and shadcn/ui primitives. |
| `components/ui/` | shadcn/Radix UI component primitives. |
| `lib/` | Domain logic, typed Supabase clients, query helpers, serializers, AI Builder services. |
| `hooks/` | Shared hooks mirrored from UI primitives. |
| `public/` | Icons and placeholder assets. |
| `sql/` | Supabase schema, RLS, theme, AI Builder, and seed SQL. |
| `styles/` | Legacy/global style file not imported by the app. Active global CSS is `app/globals.css`. |
| `docs/` | Maintainer and AI assistant documentation. |

## Important Routes

| Route | Status | Notes |
| --- | --- | --- |
| `/` | Working | Redirects to first workspace or `/workspaces/new`. |
| `/login`, `/signup` | Working | Centered auth cards backed by Supabase auth actions. |
| `/workspaces/new` | Working | Creates workspace and owner membership. |
| `/workspaces/[workspaceId]` | Working | Workspace dashboard. |
| `/workspaces/[workspaceId]/settings` | Working | White-label settings. |
| `/databases` | Working/partial | Collection, field, and basic record engine. |
| `/views` | Working/partial | Saved view builder. Dashboard view is a placeholder. |
| `/pages` | Working/partial | Page/tab/widget layout builder. |
| `/settings/theme` | Working/partial | Theme/style engine. |
| `/ai-builder` | Working/partial | AI preview/apply/undo for supported actions. |
| `/templates`, `/agents`, `/automations`, `/portal-preview` | Placeholder/static | Currently use hardcoded data and UI mocks. |

For a full inventory, see [docs/ROUTES.md](docs/ROUTES.md).

## Development Notes

- Keep all tenant-owned data scoped by `workspace_id`.
- User-facing names can change; stable IDs are UUIDs in Supabase.
- Do not expose service role, Gemini, n8n, email, or security keys in frontend code.
- Prefer server actions for first-party form mutations and route handlers for API/webhook surfaces.
- Validate workspace membership before any service-role write.
- AI Builder must return structured JSON and store a preview before applying changes.
- Destructive or update-like AI actions should remain preview/confirmation based.
- Managed/internal agent areas should not be exposed to client-facing users.

## Known Gaps / Current Limitations

- `templates`, `agents`, `automations`, and `portal-preview` are static or mock-driven.
- n8n webhook receiver is not implemented.
- Google Drive and email integrations are environment placeholders only.
- RLS SQL currently covers read policies and AI preview inserts; most writes depend on service-role server validation.
- `next.config.mjs` ignores TypeScript errors during `npm run build`; run `npx tsc --noEmit --incremental false` during development.
- `styles/globals.css` appears to be a legacy style file; the imported stylesheet is `app/globals.css`.
- `supabase_schema_v1.sql` and `supabase_ai_builder_v1.sql` both define `ai_builder_previews`; docs treat the AI file as a module patch.
- There are previously modified runtime files in the working tree. This documentation task does not change runtime behavior.

See [docs/KNOWN-GAPS.md](docs/KNOWN-GAPS.md).

## How To Continue Building

1. Read [docs/AI-CONTEXT.md](docs/AI-CONTEXT.md) before starting a new module.
2. Find the route in [docs/ROUTES.md](docs/ROUTES.md).
3. Trace the data path through `app/*/page.tsx` -> `lib/*/queries.ts` -> Supabase table.
4. For mutations, inspect the matching `app/*/actions.ts` or `app/api/*/route.ts`.
5. Add or update SQL intentionally; every tenant-owned table should include `workspace_id`.
6. Keep server-only keys in backend-only files. Do not add `NEXT_PUBLIC_` to secrets.
7. Document partial features clearly before expanding them.
