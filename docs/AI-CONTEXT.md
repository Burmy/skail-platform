# AI Coding Context

Use this file at the start of future Codex, Claude, or ChatGPT coding sessions.

## Product Vision

SKAIL is a multi-tenant AI-assisted workspace and portal platform. The target experience is a premium, simple, smooth, Notion-like workspace/page operating system for client portals and internal AI operations.

Users should be able to:

- Create tenant workspaces.
- Build databases/collections and records.
- Create table, kanban, calendar, and dashboard-like views.
- Arrange pages/tabs with reusable widgets.
- Apply workspace/page/widget/view styling with safe tokens.
- Ask AI Builder for structured workspace changes, preview them, and apply only after confirmation.
- Eventually use managed agents and n8n automations without exposing internal areas to client-facing users.

## Current Implemented State

Implemented:

- Supabase Auth login/signup/logout/callback.
- Workspace creation, dashboard, and white-label settings.
- Collection/property/record engine.
- Saved view engine.
- Page/widget layout builder.
- Theme/style engine with safe token schema.
- AI Builder chat, preview storage, apply, and undo for supported actions.

Partial:

- Field types such as file/person/relation/formula are present but not fully implemented.
- Dashboard view type exists but is not a full dashboard builder.
- Widgets render simple previews and some placeholder content.
- AI Builder apply supports a subset of possible actions.

Placeholder/mock:

- Templates route.
- Agents route.
- Automations route.
- Portal preview route.
- n8n, Google Drive, and email integrations.

## Codebase Rules

- Do not expose secrets in frontend code.
- Do not put `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, n8n secrets, email secrets, or signing/encryption secrets in `NEXT_PUBLIC_*`.
- Every tenant-owned table should have `workspace_id`.
- Every workspace-scoped query/mutation should filter by `workspace_id`.
- User-facing names can change; stable backend IDs should not.
- Validate active workspace membership before service-role writes.
- Keep AI Builder actions structured JSON.
- Store AI previews before applying.
- Destructive changes require preview/confirmation.
- Keep managed/internal agent areas hidden from client-facing users.

## Important Architecture Decisions

- App Router is the primary routing model.
- Route-level pages are usually Server Components.
- Interactive builder surfaces are Client Components.
- Mutations use server actions unless the surface is API-like.
- AI Builder uses backend route handlers, not frontend model calls.
- Supabase read access is protected by RLS; many writes use service role after server-side validation.
- Theme/style values are safe tokens, not arbitrary CSS or JavaScript.

## What Not To Break

- Auth cookie handling in `lib/supabase/proxy.ts` and `lib/supabase/server.ts`.
- Workspace membership checks before writes.
- `workspace_id` scoping on every tenant-owned mutation.
- AI Builder preview/apply/undo separation.
- System field hiding for normal users.
- Locked/system field protections.
- Safe theme token validation.
- `.env` ignore behavior.

## Before Editing Code, Inspect These Files First

For any task:

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/ROUTES.md`
- `docs/DATA-MODEL.md`
- `.env.example`
- `package.json`
- `proxy.ts`

For Supabase/auth:

- `lib/supabase/*`
- `lib/workspaces/queries.ts`
- `app/auth/actions.ts`
- `sql/supabase_schema_v1.sql`
- `sql/supabase_rls_v1.sql`

For databases:

- `app/databases/actions.ts`
- `components/properties/property-engine.tsx`
- `lib/properties/queries.ts`
- `lib/properties/types.ts`

For views:

- `app/views/actions.ts`
- `components/views/view-engine.tsx`
- `lib/views/queries.ts`
- `lib/views/types.ts`

For pages/layout:

- `app/pages/actions.ts`
- `components/layout-builder/layout-builder.tsx`
- `lib/layout/queries.ts`
- `lib/layout/types.ts`

For theme:

- `app/settings/theme/actions.ts`
- `components/theme/theme-styling-engine.tsx`
- `lib/theme/*`
- `sql/supabase_theme_styling_v1.sql`

For AI Builder:

- `app/api/ai-builder/*/route.ts`
- `components/ai-builder/ai-builder-chat.tsx`
- `lib/ai-builder/*`
- `sql/supabase_ai_builder_v1.sql`

## Naming Conventions

- Tables use snake_case.
- Tenant-owned tables use `workspace_id`.
- User-facing labels can be `name`, `title`, `display_name`, etc.
- Stable identifiers are UUID `id` fields.
- Server action input schemas are usually named `*Schema`.
- Query helpers are usually in `lib/<domain>/queries.ts`.
- Domain types and serializers are usually in `lib/<domain>/types.ts`.

## Where To Add New Features

| Feature type | Suggested location |
| --- | --- |
| New route | `app/<route>/page.tsx` |
| Form mutation | `app/<route>/actions.ts` |
| API/webhook | `app/api/<feature>/route.ts` |
| Shared query/data loader | `lib/<feature>/queries.ts` |
| Domain types/serializers | `lib/<feature>/types.ts` |
| Product component | `components/<feature>/` |
| shadcn primitive | `components/ui/` only if it is a generic primitive |
| Supabase schema | `sql/` with clear module name |
| Developer docs | `docs/` |

## Supabase and RLS Guidance

- Use the SSR client for user-scoped reads in Server Components and query helpers.
- Use the admin client only in server-only contexts.
- Never import `lib/supabase/admin.ts` into Client Components.
- For writes with service role:
  1. Get the current user from the SSR client.
  2. Query `workspace_members`.
  3. Verify active membership and role.
  4. Write with admin client and filter by `workspace_id`.
  5. Revalidate relevant routes.
- When adding a table, add RLS, policies, indexes, database types, and docs.

## Multi-Tenant Boundary Guidance

Every user-visible workspace feature should answer:

- Which `workspace_id` is active?
- How did the user prove membership?
- Which role is required for this mutation?
- Are all reads/writes filtered by `workspace_id`?
- Could an ID from another workspace be passed into the action?

Validate child resources belong to the same workspace before connecting them. Examples:

- A widget data source must be a collection/view in the same workspace.
- A view must belong to the collection/workspace being edited.
- A style row must reference a page/widget/view in the same workspace.

## UI/UX Direction

- Premium, simple, calm, smooth.
- Notion-like workspace/page OS.
- Minimal clutter.
- Clear builder panels and predictable controls.
- Reusable components.
- Keep dashboard/product UI practical and dense enough for repeated work.
- Avoid marketing-page composition inside the app.
- Use icons for common commands.
- Keep cards for real grouped content, not nested decoration.

## Safe Change Process

1. Inspect the route, component, query helper, action, and SQL before editing.
2. Preserve existing patterns.
3. Make the smallest scoped change.
4. Do not modify unrelated dirty files.
5. Run `npx tsc --noEmit --incremental false` for TypeScript-sensitive changes.
6. Run `npm run build` for deployment-sensitive changes.
7. Run `npm run lint` when practical.
8. Update docs when behavior or architecture changes.

## Current Follow-up Priorities

High:

- Build real n8n signed webhook receiver.
- Decide production signup/email-confirmation policy.
- Add write RLS/role capability model.

Medium:

- Persist templates/agents/automations routes.
- Implement portal rendering from workspace pages.
- Expand AI Builder supported actions with stronger diff previews.

Low:

- Clean up legacy static data.
- Consolidate duplicate global CSS files.
- Add more formal migration/type generation workflow.
