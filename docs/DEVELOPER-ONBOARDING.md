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
sql/seed_templates_v1.sql
```

5. Run the dev server:

```bash
npm run dev
```

6. Open `http://localhost:3000`.

7. Create an account and workspace.

8. Visit:

- `/databases`
- `/views`
- `/pages`
- `/settings/theme`
- `/ai-builder`

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
- Apply SQL before testing workspace creation and builder routes.

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
route page -> query helper -> Supabase tables -> client component -> server action
```

Example: Databases

```text
app/databases/page.tsx
  -> lib/properties/queries.ts
    -> collections, collection_fields, collection_records, record_values
  -> components/properties/property-engine.tsx
    -> app/databases/actions.ts
```

Example: Pages

```text
app/pages/page.tsx
  -> lib/layout/queries.ts
    -> pages, widgets, page_style_settings, widget_style_settings
  -> components/layout-builder/layout-builder.tsx
    -> app/pages/actions.ts
```

Example: AI Builder

```text
app/ai-builder/page.tsx
  -> components/ai-builder/ai-builder-chat.tsx
    -> app/api/ai-builder/chat/route.ts
      -> lib/ai-builder/context.ts
      -> lib/ai-builder/gemini.ts
      -> lib/ai-builder/store.ts
```

## Add a New Route Safely

1. Create `app/<route>/page.tsx`.
2. Decide whether it needs auth/workspace membership.
3. If it is workspace-scoped, resolve `workspace_id` from params/search params and validate with `getWorkspaceForUser`.
4. Use `DashboardLayout` for authenticated workspace surfaces.
5. Put interactive UI in a Client Component under `components/<feature>/`.
6. Put data loading in `lib/<feature>/queries.ts`.
7. Put form mutations in `app/<route>/actions.ts`.
8. Add the route to `docs/ROUTES.md`.

## Add a New Supabase Table

1. Add SQL in `sql/` with a clear filename.
2. Include `workspace_id` if the table is tenant-owned.
3. Add foreign keys with clear delete behavior.
4. Enable RLS.
5. Add at least read policies.
6. Add write policies when role capabilities are ready, or validate writes server-side with service role.
7. Update `lib/supabase/database.types.ts`.
8. Document the table in `docs/DATA-MODEL.md`.
9. Update environment/docs if the table supports an integration.

## Add a New Server Action

1. Place it in the route's `actions.ts`.
2. Mark the file with `'use server'`.
3. Parse `FormData` with Zod.
4. Get current user through `createClient()`.
5. Check active `workspace_members`.
6. Check role/permission.
7. Use `createAdminClient()` only after validation.
8. Filter writes by `workspace_id`.
9. Revalidate affected routes.
10. Return a small action state for UI messages.

## Add a New API Route

Use route handlers for:

- AI/backend APIs called from client components.
- Webhooks.
- External integrations.
- Non-form JSON endpoints.

Guidelines:

- Validate JSON body with Zod.
- Return JSON errors with correct HTTP status.
- Do not rely on proxy auth redirects.
- Re-check auth/session inside the route.
- Keep secrets server-only.

## Add a New UI Component

1. Check `components/ui/` first for existing primitives.
2. Put product-specific components under `components/<feature>/`.
3. Use TypeScript props.
4. Keep data fetching outside Client Components when possible.
5. Keep forms connected to server actions.
6. Avoid introducing new dependencies without a clear reason.

## Add a New Widget Type

1. Update `lib/layout/types.ts`.
2. Add metadata in `WIDGET_TYPE_META`.
3. Add icon/rendering in `components/layout-builder/layout-builder.tsx`.
4. Add server action validation if needed.
5. Update AI Builder allowed widget types if it should be AI-buildable.
6. Update docs.

## Add a New Property Type

1. Update `lib/properties/types.ts`.
2. Add type metadata.
3. Update `PropertyEngine` render/edit behavior.
4. Update record serialization in `app/databases/actions.ts`.
5. Update AI Builder contract if it should be AI-buildable.
6. Update docs and SQL constraints if constraints are added later.

## Add AI Builder Actions

1. Update `lib/ai-builder/contract.ts`.
2. Update prompt action shapes in `lib/ai-builder/gemini.ts`.
3. Update apply behavior in `lib/ai-builder/apply.ts`.
4. Update preview rendering in `components/ai-builder/ai-builder-chat.tsx` if needed.
5. Ensure destructive changes are preview-only or require confirmation.
6. Add undo support for anything applied.
7. Update docs.

## Common Commands

```bash
npm run dev
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

Notes:

- `npm run build` currently ignores TypeScript build errors because of `next.config.mjs`.
- Use `npx tsc --noEmit --incremental false` to catch TypeScript issues.

## Review Checklist

Before ending a task:

- Did you avoid changing unrelated dirty files?
- Did you preserve `workspace_id` scoping?
- Did you validate membership before writes?
- Did you keep secrets server-only?
- Did you update documentation if behavior changed?
- Did you run the appropriate checks?
