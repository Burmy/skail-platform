# SKAIL Platform

SKAIL is a multi-tenant workspace and portal platform. It is moving toward a Notion-like workspace/page OS with Softr-style portal publishing: workspace owners build pages, stacks, databases, views, AI-assisted workflows, and shared portal surfaces for other users.

The app is still an active product build. Core workspace, auth, pages, database, view, theme, sharing, and AI Builder foundations exist. Agents, automations, templates, and portal preview still include placeholder or static areas.

## Tech Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js App Router |
| Language | TypeScript |
| UI | Tailwind CSS v4, shadcn/ui, Radix UI, lucide-react |
| Page editor | BlockNote with SKAIL custom blocks and multi-column support |
| Database UI | Custom React database views plus dnd-kit for drag interactions |
| Auth/data | Supabase Auth, Postgres, RLS, `@supabase/ssr`, `@supabase/supabase-js` |
| AI Builder | Gemini API through backend route handlers only |
| Deployment target | Vercel |
| Analytics | Vercel Analytics in production |
| Automation integration | n8n planned via signed webhooks; no receiver is implemented yet |

## Current Product Surface

Implemented or partially implemented:

- Auth: login, signup, logout, callback route, Supabase session refresh through `proxy.ts`.
- Workspaces: create workspaces, list user workspaces, owner membership creation, workspace dashboard, Level 2 white-label settings.
- Persistent workspace shell: app routes under `app/(workspace)` share one sidebar/header shell with workspace theme application and cached shell data.
- Pages: stacks, recents, trash, BlockNote page documents, icons, covers, page visits, sharing controls, portal shell for shared users, and public/share routes.
- Sharing: page/stack invite links, public links, accepted access grants, share event audit rows, and view/edit/manage access levels.
- Databases/collections: create and rename collections, create/update fields, archive/restore, add options, create/update records, and local-first embedded database interactions.
- Views: saved views are managed inside databases. Current view types include table, kanban, calendar, gallery, list, timeline, map, chart, dashboard placeholder, and form/public-form behavior.
- Embedded database blocks: page blocks can store exact `collectionId`, `viewId`, `viewType`, source labels, and local view overrides.
- Theme/styling: workspace theme tokens, page styles, widget styles, view styles, personal/shared theme paths, theme reset, and light/dark/system mode support.
- AI Builder: chat UI, preview storage, Gemini structured JSON generation, apply, and undo for supported actions.
- Link blocks: page editor supports link preview/bookmark/embed/mention-style custom blocks through safe backend preview helpers.
- Placeholder/static areas: templates, agents, automations, and portal preview.

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
| `SUPABASE_SERVICE_ROLE_KEY` | Yes for current write/admin flows | Server-only key used for workspace creation, writes, sharing, AI apply, and auto-confirm signup. |
| `SKAIL_AUTO_CONFIRM_SIGNUPS` | Optional | When not `false`, server signup can auto-confirm with service role and immediately sign in the user. |
| `GEMINI_API_KEY` | Required for AI Builder | Server-only Gemini API key. |
| `AI_BUILDER_MODEL` | Optional | Defaults to `gemini-2.5-flash`. |

Future/planned variables include n8n, Google Drive, email provider, and security signing/encryption keys.

## Supabase Setup

Apply SQL in this order for the current codebase:

1. `sql/supabase_schema_v1.sql`  
   Foundation tables: workspaces, memberships, collections, fields, records, views, pages/widgets, AI Builder previews, templates, agents, and webhook events.

2. `sql/supabase_rls_v1.sql`  
   Enables baseline RLS and read policies based on active workspace membership.

3. `sql/supabase_theme_styling_v1.sql`  
   Adds theme/style tables and policies.

4. `sql/supabase_ai_builder_v1.sql`  
   AI Builder module patch for preview storage and policies.

5. `sql/supabase_pages_engine_v1.sql`  
   Adds Notion-like page engine tables: stacks, page documents, recents/visits, forms, and page trash metadata.

6. `sql/supabase_page_sharing_v1.sql`  
   Adds page/stack share links, accepted access grants, share events, and sharing-aware RLS helpers.

7. `sql/supabase_database_engine_v2.sql`  
   Adds database engine extensions used by newer views, archive behavior, files/forms, and performance indexes.

8. `sql/seed_templates_v1.sql`  
   Seeds platform templates and agent templates.

Most mutation code validates membership or page access in server actions/API routes, then writes with the service role client. RLS is still stronger for reads than writes; do not remove server-side checks.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start local Next dev server with increased header size. |
| `npm run build` | Production build. `next.config.mjs` currently sets `typescript.ignoreBuildErrors: true`, so run TypeScript separately. |
| `npm run start` | Start production server after build. |
| `npm run lint` | Run ESLint over the repository. |

Recommended validation:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Folder Structure

| Path | Purpose |
| --- | --- |
| `app/` | Next.js routes, route handlers, server actions, global CSS, root layout. |
| `app/(workspace)/` | Authenticated workspace app routes wrapped by the persistent workspace shell. URL paths are unchanged. |
| `components/` | Product components and shadcn/ui primitives. |
| `components/pages/` | BlockNote page editor, page shell, sharing UI, portal shell, source picker, page nav. |
| `components/databases/` | Database shell, toolbar, views, field cells/editors, archive, optimistic hooks. |
| `components/ui/` | shadcn/Radix UI component primitives. |
| `lib/` | Domain logic, typed Supabase clients, query helpers, serializers, AI Builder services. |
| `public/` | Icons and placeholder assets. |
| `sql/` | Supabase schema, RLS, theme, pages, sharing, database engine, AI Builder, and seed SQL. |
| `styles/` | Legacy/global style file not imported by the app. Active global CSS is `app/globals.css`. |
| `docs/` | Maintainer and AI assistant documentation. |

## Important Routes

| Route | Status | Notes |
| --- | --- | --- |
| `/` | Working | Redirects to first workspace or `/workspaces/new`. |
| `/login`, `/signup` | Working | Centered auth cards backed by Supabase auth actions. |
| `/workspaces/new` | Working | Creates workspace and owner membership. |
| `/workspaces/[workspaceId]` | Working | Workspace dashboard inside persistent shell. |
| `/workspaces/[workspaceId]/settings` | Working | White-label settings. |
| `/pages` | Working/partial | Page home with recents/stacks and page creation. |
| `/p/[pageId]` | Working/partial | BlockNote page editor for workspace members and accepted shared users. |
| `/pages/trash` | Working/partial | Archived page restore surface. |
| `/databases`, `/databases/[collectionId]` | Working/partial | Database app and saved view engine. |
| `/settings/theme` | Working/partial | Theme/style engine. |
| `/share/[token]`, `/invite/[token]` | Working/partial | Public and signed-in page/stack sharing entry points. |
| `/f/[slug]` | Working/partial | Public database form view. |
| `/ai-builder` | Working/partial | AI preview/apply/undo for supported actions. |
| `/templates`, `/agents`, `/automations`, `/portal-preview` | Placeholder/static | Currently use hardcoded or partially mocked product data. |

There is no standalone `/views` route now; saved views are managed inside `/databases/[collectionId]`.

For a full inventory, see [docs/ROUTES.md](docs/ROUTES.md).

## Development Notes

- Keep all tenant-owned data scoped by `workspace_id`.
- User-facing names can change; stable IDs are UUIDs in Supabase.
- Do not expose service role, Gemini, n8n, email, or security keys in frontend code.
- Prefer server actions for first-party form mutations and route handlers for API/webhook surfaces.
- Validate workspace membership or page/share access before any service-role write.
- Embedded databases on pages should not call `router.refresh()` for normal cell/dropdown/record interactions.
- AI Builder must return structured JSON and store a preview before applying changes.
- Destructive or update-like AI actions should remain preview/confirmation based.
- Managed/internal agent areas should not be exposed to portal/shared users.

## Known Gaps / Current Limitations

- `templates`, `agents`, `automations`, and `portal-preview` are static or mock-driven.
- n8n webhook receiver is not implemented.
- Google Drive and email integrations are environment placeholders only.
- RLS SQL is still more complete for reads than writes; most writes depend on service-role server validation.
- `next.config.mjs` ignores TypeScript errors during `npm run build`; run `npx tsc --noEmit` during development.
- `styles/globals.css` appears to be a legacy style file; the imported stylesheet is `app/globals.css`.
- Some lint warnings remain around existing hook dependencies and image usage.
- Embedded gallery cards support cover setup/upload, but full page-canvas record-opening behavior needs more manual QA.

See [docs/KNOWN-GAPS.md](docs/KNOWN-GAPS.md).

## How To Continue Building

1. Read [docs/AI-CONTEXT.md](docs/AI-CONTEXT.md) and `DESIGN.md` before starting a new module.
2. Find the route in [docs/ROUTES.md](docs/ROUTES.md).
3. Trace the data path through the route -> component -> `lib/*/queries.ts` -> Supabase table.
4. For mutations, inspect the matching `app/*/actions.ts` or `app/api/*/route.ts`.
5. Add or update SQL intentionally; every tenant-owned table should include `workspace_id`.
6. Keep server-only keys in backend-only files. Do not add `NEXT_PUBLIC_` to secrets.
7. Preserve the persistent workspace shell and local-first embedded database behavior.
8. Document partial features clearly before expanding them.
