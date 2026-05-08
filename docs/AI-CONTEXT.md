# AI Coding Context

Use this file at the start of future Codex, Claude, or ChatGPT coding sessions.

## Product Vision

SKAIL is a multi-tenant AI-assisted workspace and portal platform. The target experience is a premium, simple, smooth, Notion-like workspace/page operating system combined with Softr-style portal publishing.

Users should be able to:

- Create tenant workspaces.
- Build pages and stacks.
- Build databases/collections, records, and saved views.
- Embed database views inside pages.
- Share whole stacks or specific pages with other signed-in users or public viewers.
- Apply workspace/page/widget/view styling with safe tokens.
- Ask AI Builder for structured workspace changes, preview them, and apply only after confirmation.
- Eventually use managed agents and n8n automations without exposing internal areas to portal/shared users.

## Current Implemented State

Implemented/partial:

- Supabase Auth login/signup/logout/callback.
- Workspace creation, dashboard, white-label settings, and persistent workspace shell.
- BlockNote pages, stacks, recents, trash, page documents, page visits, and custom SKAIL blocks.
- Page/stack sharing with invite links, public links, accepted grants, and portal shell.
- Collection/property/record engine.
- Saved database views inside `/databases/[collectionId]`.
- Embedded database page blocks with exact source/view identity and page-local overrides.
- Theme/style engine with safe token schema, reset, and light/dark/system mode.
- AI Builder chat, preview storage, apply, and undo for supported actions.

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
- Validate page/share access for shared/public page operations.
- Keep AI Builder actions structured JSON.
- Store AI previews before applying.
- Destructive changes require preview/confirmation.
- Keep managed/internal agent areas hidden from portal/shared users.

## Important Architecture Decisions

- App Router is the primary routing model.
- Workspace app routes live under `app/(workspace)` so public URLs stay the same while the shell persists.
- `WorkspaceShell` fetches `/api/workspaces/shell` and keeps sidebar/header stable across route changes.
- Route-level pages are usually Server Components.
- Interactive builder surfaces are Client Components.
- Mutations use server actions unless the surface is API-like.
- AI Builder uses backend route handlers, not frontend model calls.
- Supabase read/share access is protected by RLS and helper functions; many writes use service role after server-side validation.
- Theme/style values are safe tokens, not arbitrary CSS or JavaScript.
- Saved views live inside databases; do not reintroduce a standalone `/views` route unless product direction changes.

## What Not To Break

- Auth cookie handling in `lib/supabase/proxy.ts` and `lib/supabase/server.ts`.
- Workspace membership checks before writes.
- Page/share access checks in `lib/pages/access.ts`.
- `workspace_id` scoping on every tenant-owned mutation.
- Persistent workspace shell behavior.
- Page public/shared/workspace mode behavior.
- Embedded database source validation against the page document.
- Embedded database local-first behavior; avoid `router.refresh()` for normal cell/dropdown/record interactions.
- AI Builder preview/apply/undo separation.
- System field hiding and locked/system field protections.
- Safe theme token validation.
- `.env` ignore behavior.

## Before Editing Code, Inspect These Files First

For any task:

- `README.md`
- `DESIGN.md` for UI/UX tasks
- `docs/ARCHITECTURE.md`
- `docs/ROUTES.md`
- `docs/DATA-MODEL.md`
- `.env.example`
- `package.json`
- `proxy.ts`

For shell/navigation:

- `app/(workspace)/layout.tsx`
- `components/workspace-shell.tsx`
- `components/dashboard-layout.tsx`
- `components/app-sidebar.tsx`
- `app/api/workspaces/shell/route.ts`

For Supabase/auth:

- `lib/supabase/*`
- `lib/workspaces/queries.ts`
- `app/auth/actions.ts`
- `sql/supabase_schema_v1.sql`
- `sql/supabase_rls_v1.sql`

For pages/sharing:

- `app/pages/actions.ts`
- `app/pages/share-actions.ts`
- `app/(workspace)/p/[pageId]/page.tsx`
- `app/share/[token]/page.tsx`
- `app/invite/[token]/page.tsx`
- `components/pages/*`
- `components/pages/blocks/*`
- `lib/pages/access.ts`
- `lib/pages/queries.ts`
- `sql/supabase_pages_engine_v1.sql`
- `sql/supabase_page_sharing_v1.sql`

For databases/views:

- `app/databases/actions.ts`
- `components/databases/database-shell.tsx`
- `components/databases/database-toolbar.tsx`
- `components/databases/views/*`
- `components/pages/blocks/embedded-database.tsx`
- `lib/databases/queries.ts`
- `lib/views/types.ts`
- `sql/supabase_database_engine_v2.sql`

For theme:

- `app/settings/theme/actions.ts`
- `components/theme/theme-styling-engine.tsx`
- `components/theme-provider.tsx`
- `components/theme-mode-toggle.tsx`
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
| Workspace route | `app/(workspace)/<route>/page.tsx` |
| Public route | `app/<route>/page.tsx` |
| Form mutation | `app/<route>/actions.ts` |
| API/webhook | `app/api/<feature>/route.ts` |
| Shared query/data loader | `lib/<feature>/queries.ts` |
| Domain types/serializers | `lib/<feature>/types.ts` |
| Product component | `components/<feature>/` |
| Page custom block | `components/pages/blocks/` |
| shadcn primitive | `components/ui/` only if it is a generic primitive |
| Supabase schema | `sql/` with clear module name |
| Developer docs | `docs/` |

## Supabase and RLS Guidance

- Use the SSR client for user-scoped reads in Server Components and query helpers.
- Use the admin client only in server-only contexts.
- Never import `lib/supabase/admin.ts` into Client Components.
- For writes with service role:
  1. Get the current user from the SSR client.
  2. Query `workspace_members` or page/share access.
  3. Verify active membership and role or access level.
  4. Write with admin client and filter by `workspace_id`.
  5. Revalidate relevant routes only when needed.
- When adding a table, add RLS, policies, indexes, database types, and docs.

## Multi-Tenant Boundary Guidance

Every user-visible workspace feature should answer:

- Which `workspace_id` is active?
- How did the user prove membership or page/share access?
- Which role/access level is required for this mutation?
- Are all reads/writes filtered by `workspace_id`?
- Could an ID from another workspace be passed into the action?

Validate child resources belong to the same workspace before connecting them. Examples:

- An embedded database source must be a collection/view in the same workspace.
- A shared user can mutate exposed records only if that source is embedded in the page document.
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

Before UI/UX changes, read `DESIGN.md` and follow its direction. Do not introduce unrelated visual systems or one-off hard-coded styles.

## Safe Change Process

1. Inspect the route, component, query helper, action, and SQL before editing.
2. Preserve existing patterns.
3. Make the smallest scoped change.
4. Do not modify unrelated dirty files.
5. For embedded databases, prefer local state/optimistic sync over route refresh.
6. Run `npx tsc --noEmit` for TypeScript-sensitive changes.
7. Run `npm run lint` when practical.
8. Run `npm run build` for deployment-sensitive changes.
9. Update docs when behavior or architecture changes.

## Current Follow-up Priorities

High:

- Build real n8n signed webhook receiver.
- Decide production signup/email-confirmation policy.
- Add write RLS/role capability model.
- Continue polishing page/database responsiveness.

Medium:

- Persist templates/agents/automations routes.
- Replace portal preview mock with real published portal rendering.
- Expand AI Builder supported actions with stronger diff previews.

Low:

- Clean up legacy static data.
- Consolidate duplicate global CSS files.
- Add formal migration/type generation workflow.
