# Developer Onboarding

This guide is for a new developer or AI assistant starting work in the SKAIL repo.

## First-Day Checklist

1. Install Node dependencies:

```bash
npm install
```

2. Create local environment file:

```bash
copy .env.example .env
```

3. Fill local Supabase variables in `.env`.

4. Apply Supabase SQL in order:

```text
sql/supabase_schema_v1.sql
sql/supabase_rls_v1.sql
sql/supabase_theme_styling_v1.sql
sql/supabase_ai_builder_v1.sql
sql/supabase_pages_engine_v1.sql
sql/supabase_page_sharing_v1.sql
sql/supabase_database_engine_v2.sql
sql/seed_templates_v1.sql
```

5. Run the dev server:

```bash
npm run dev
```

6. Open `http://localhost:3000`.

7. Create an account and workspace, or use local test credentials if provided in your private `.env`.

8. Visit:

- `/workspaces/[workspaceId]`
- `/pages?workspace_id=[workspaceId]`
- `/databases?workspace_id=[workspaceId]`
- `/settings/theme?workspace_id=[workspaceId]`
- `/ai-builder?workspace_id=[workspaceId]`

Saved views are inside the Databases app; there is no standalone `/views` route.

## Local Supabase Setup

Minimum required values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Recommended for AI Builder:

- `GEMINI_API_KEY`
- `AI_BUILDER_MODEL` if overriding the default

Important:

- Service role key is server-only.
- Do not put service role or Gemini key in `NEXT_PUBLIC_*`.
- Apply SQL before testing workspace creation, pages, sharing, databases, and builder routes.

## Create a Test Workspace

1. Sign up.
2. If service role auto-confirm is configured, the app should sign you in directly.
3. If not, confirm email through Supabase or disable email confirmation for local development.
4. Go to `/workspaces/new`.
5. Enter a workspace name.
6. Optionally enter a portal subdomain.
7. Submit.

The server action creates:

- `workspaces` row.
- `workspace_members` row with `role_key = owner`.

## Trace a Page

Use this pattern:

```text
route page -> query helper/access helper -> Supabase tables -> client component -> server action/API route
```

Example: workspace shell

```text
app/(workspace)/layout.tsx
  -> components/workspace-shell.tsx
    -> app/api/workspaces/shell/route.ts
      -> lib/workspaces/queries.ts
      -> lib/theme/applied-theme.ts
    -> components/dashboard-layout.tsx
    -> components/app-sidebar.tsx
```

Example: page editor

```text
app/(workspace)/p/[pageId]/page.tsx
  -> lib/pages/access.ts
  -> page_documents
  -> components/pages/page-shell.tsx
  -> components/pages/page-editor.tsx
  -> app/pages/actions.ts
```

Example: embedded database block

```text
components/pages/blocks/database-view-block.tsx
  -> components/pages/blocks/embedded-database.tsx
    -> app/api/pages/databases/shell/route.ts
      -> lib/pages/document-sources.ts
      -> lib/databases/queries.ts
    -> components/databases/database-shell.tsx
```

Example: Databases

```text
app/(workspace)/databases/[collectionId]/page.tsx
  -> lib/databases/queries.ts
    -> collections, collection_fields, collection_records, record_values, views
  -> components/databases/database-shell.tsx
    -> app/databases/actions.ts
```

Example: AI Builder

```text
app/(workspace)/ai-builder/page.tsx
  -> components/ai-builder/ai-builder-chat.tsx
    -> app/api/ai-builder/chat/route.ts
      -> lib/ai-builder/context.ts
      -> lib/ai-builder/gemini.ts
      -> lib/ai-builder/store.ts
```

## Add a New Workspace Route Safely

1. Create `app/(workspace)/<route>/page.tsx`.
2. Decide whether it needs `workspace_id` from query or route params.
3. Validate membership with existing workspace query helpers.
4. Render route body only; the persistent shell is already provided by `app/(workspace)/layout.tsx`.
5. Put interactive UI in a Client Component under `components/<feature>/`.
6. Put data loading in `lib/<feature>/queries.ts`.
7. Put form mutations in `app/<route>/actions.ts` if they are shared across route groups.
8. Add the route to `docs/ROUTES.md`.

## Add a Public Route Safely

Use public routes for:

- auth
- public sharing
- invite acceptance
- public forms
- webhooks

Guidelines:

- Do not rely on the workspace shell.
- Validate token/signature/access inside the route.
- Keep public writes narrowly scoped.
- Do not expose service-role behavior to the browser.

## Add a New Supabase Table

1. Add SQL in `sql/` with a clear filename.
2. Include `workspace_id` if the table is tenant-owned.
3. Add foreign keys with clear delete behavior.
4. Enable RLS.
5. Add read policies.
6. Add write policies when role capabilities are ready, or validate writes server-side with service role.
7. Update `lib/supabase/database.types.ts`.
8. Document the table in `docs/DATA-MODEL.md`.
9. Update environment/docs if the table supports an integration.

## Add a New Server Action

1. Place it in the route's `actions.ts`.
2. Mark the file with `'use server'`.
3. Parse input with Zod.
4. Get current user through `createClient()`.
5. Check active `workspace_members` or page/share access.
6. Check role/access level.
7. Use `createAdminClient()` only after validation.
8. Filter writes by `workspace_id`.
9. Revalidate affected routes only when needed.
10. Return a small action state for UI messages.

## Add a New API Route

Use route handlers for:

- AI/backend APIs called from client components.
- Webhooks.
- External integrations.
- Embedded database/page source APIs.
- Public form/token endpoints.

Guidelines:

- Validate JSON/query/body with Zod or explicit checks.
- Return JSON errors with correct HTTP status.
- Do not rely on proxy auth redirects.
- Re-check auth/session/token inside the route.
- Keep secrets server-only.

## Add a New UI Component

1. Check `components/ui/` first for existing primitives.
2. Put product-specific components under `components/<feature>/`.
3. Use TypeScript props.
4. Keep data fetching outside Client Components when possible.
5. Keep forms connected to server actions or route handlers.
6. Avoid introducing new dependencies without a clear reason.
7. For UI work, read `DESIGN.md` first.

## Add a New Page Block

1. Update `components/pages/blocks/index.ts`.
2. Add a block renderer under `components/pages/blocks/`.
3. Decide whether the block stores content in BlockNote props, page document JSON, or a related table.
4. If it references database/page sources, validate those sources server-side.
5. Update slash menu behavior in `components/pages/blocks/slash-menu.tsx` if it should be insertable.
6. Update docs.

## Add a New Database View Type

1. Update `lib/views/types.ts`.
2. Add default config and parsing/serialization.
3. Add route/action validation in `app/databases/actions.ts`.
4. Add renderer in `components/databases/views/`.
5. Add view metadata/icons in view tabs/source pickers.
6. Update embedded database handling if the view should work on pages.
7. Update docs.

## Add AI Builder Actions

1. Update `lib/ai-builder/contract.ts`.
2. Update prompt/action shapes in `lib/ai-builder/gemini.ts`.
3. Update apply behavior in `lib/ai-builder/apply.ts`.
4. Update preview rendering in `components/ai-builder/ai-builder-chat.tsx` if needed.
5. Ensure destructive changes are preview-only or require confirmation.
6. Add undo support for anything applied.
7. Update docs.

## Common Commands

```bash
npm run dev
npx tsc --noEmit
npm run lint
npm run build
```

Notes:

- `npm run build` currently ignores TypeScript build errors because of `next.config.mjs`.
- Use `npx tsc --noEmit` to catch TypeScript issues.

## Review Checklist

Before ending a task:

- Did you avoid changing unrelated dirty files?
- Did you preserve `workspace_id` scoping?
- Did you validate membership or page/share access before writes?
- Did you keep secrets server-only?
- Did you avoid unnecessary `router.refresh()` in embedded/interactive surfaces?
- Did you update documentation if behavior changed?
- Did you run the appropriate checks?
