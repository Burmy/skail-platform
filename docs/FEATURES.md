# Features

This document describes each feature area as it exists today.

## Workspaces

Status: implemented.

What it does:

- Creates tenant workspaces.
- Creates owner membership for the creator.
- Lists workspaces for the current user.
- Shows a workspace dashboard with counts and recent collections.
- Supports workspace white-label settings.
- Uses a persistent workspace shell for app navigation and theme application.

Main files:

- `app/page.tsx`
- `app/workspaces/new/page.tsx`
- `app/(workspace)/workspaces/[workspaceId]/page.tsx`
- `app/(workspace)/workspaces/[workspaceId]/settings/page.tsx`
- `app/api/workspaces/shell/route.ts`
- `components/workspace-shell.tsx`
- `components/workspaces/*`
- `lib/workspaces/queries.ts`

Data source:

- `workspaces`
- `workspace_members`
- Counts from `collections`, `pages`, `views`, `agent_instances`

Limitations:

- No full team-management UI yet.
- Roles are strings, not backed by a formal capabilities table.
- Owner/admin checks are implemented in code.

## Auth

Status: implemented/partial.

What it does:

- Login with email/password.
- Signup with optional server-side auto-confirm if service role is configured.
- Logout.
- Auth callback exchange for normal Supabase email confirmation flow.
- Proxy refresh and redirect for unauthenticated app routes.
- Invite routes send signed-out users through login/signup and then back to the invite.

Main files:

- `app/login/page.tsx`
- `app/signup/page.tsx`
- `app/auth/actions.ts`
- `app/auth/callback/route.ts`
- `proxy.ts`
- `lib/supabase/proxy.ts`

Limitations:

- No password reset UI.
- No OAuth providers.
- Auto-confirm signup needs a production policy decision.

## Pages and Stacks

Status: implemented/partial.

What it does:

- Creates pages and stacks.
- Shows Recents, Stacks, and Private pages in the sidebar/pages home.
- Stores page documents as BlockNote JSON in `page_documents`.
- Supports page title, icon, cover, archive/trash, visits/recents, and nested pages.
- Supports SKAIL custom blocks such as database views, forms, page links, bookmarks, embeds, and mentions.
- Supports BlockNote multi-column containers.
- Shared users can see a portal shell instead of the full SKAIL app shell.

Main files:

- `app/(workspace)/pages/page.tsx`
- `app/(workspace)/pages/trash/page.tsx`
- `app/(workspace)/p/[pageId]/page.tsx`
- `app/pages/actions.ts`
- `components/pages/*`
- `components/pages/blocks/*`
- `lib/pages/queries.ts`
- `lib/pages/access.ts`
- `lib/pages/document-sources.ts`
- `lib/pages/portal-tree.ts`

Data source:

- `page_stacks`
- `pages`
- `page_documents`
- `page_visits`
- `page_forms`

Limitations:

- Some page/sidebar operations are still being polished for instant local updates.
- BlockNote document schema is active product surface; large schema changes should be migrated carefully.
- Some custom blocks are partial renderers rather than complete production apps.

## Page and Stack Sharing

Status: implemented/partial.

What it does:

- Creates invite links and public links for page or stack scopes.
- Stores only hashed share tokens.
- Supports access levels: `view`, `edit`, `manage`.
- Accepted signed-in invite users get `page_access_grants`.
- Public links render read-only portal pages.
- Share events are recorded.
- Shared users see only shared page/stack navigation.

Main files:

- `app/share/[token]/page.tsx`
- `app/invite/[token]/page.tsx`
- `app/pages/share-actions.ts`
- `components/pages/share-dialog.tsx`
- `components/pages/invite-accept-card.tsx`
- `components/pages/portal-layout.tsx`
- `lib/pages/access.ts`
- `lib/pages/portal-tree.ts`

Data source:

- `page_share_links`
- `page_access_grants`
- `page_share_events`

Limitations:

- No outbound email invite delivery.
- Public links are view-only by design.
- Shared edit users can edit exposed content but cannot open the full database app unless they are workspace members.

## Databases / Collections

Status: implemented/partial.

What it does:

- Creates and renames collections.
- Creates, renames, archives, restores, and configures fields/properties.
- Creates, edits, archives, restores, and displays records.
- Supports stable field IDs and `semantic_role`.
- Supports local-first editing and archive/undo behavior in many surfaces.
- Supports file uploads and relation/person/formula/location editor surfaces where implemented.

Main files:

- `app/(workspace)/databases/page.tsx`
- `app/(workspace)/databases/[collectionId]/page.tsx`
- `app/databases/actions.ts`
- `components/databases/*`
- `lib/databases/*`
- `lib/properties/types.ts`

Data source:

- `collections`
- `collection_fields`
- `collection_records`
- `record_values`
- file/form extension tables from database engine SQL

Limitations:

- Some advanced field types are partial.
- Schema-level changes still need full refresh/revalidation in places.
- More RLS/write-policy hardening is needed.

## Saved Views

Status: implemented/partial.

What it does:

- Saved views live inside the database app, not a standalone `/views` route.
- Supports table, kanban, calendar, gallery, list, timeline, map, chart, dashboard, and form-style views.
- Supports view tabs, filters, advanced filters, sorts, property visibility, search, grouping/date configs, and local embedded overrides.
- Embedded database blocks store exact source/view identity instead of falling back to the first view.

Main files:

- `components/databases/view-tabs.tsx`
- `components/databases/database-toolbar.tsx`
- `components/databases/views/*`
- `lib/views/types.ts`
- `lib/views/queries.ts`
- `app/databases/actions.ts`

Data source:

- `views`
- Collection/field/record tables

Limitations:

- Dashboard/chart/map/timeline surfaces are functional but not final analytics products.
- Some view style tokens are not fully reflected in every renderer.
- Public/shared database access is intentionally constrained to embedded blocks/forms.

## Embedded Database Blocks

Status: implemented/partial.

What it does:

- Renders saved database views inside BlockNote pages.
- Loads through `/api/pages/databases/shell` with page/source validation.
- Caches embedded shell data and reuses in-flight requests to avoid refresh storms.
- Stores page-local overrides for visible fields, filters, sorts, search, and selected source/view.
- Source switcher lets managers change database/view without duplicating layout controls.
- Embedded record sheets preserve open state better across block rerenders.

Main files:

- `components/pages/blocks/database-view-block.tsx`
- `components/pages/blocks/embedded-database.tsx`
- `components/pages/source-picker-dialog.tsx`
- `components/databases/database-shell.tsx`
- `components/databases/database-toolbar.tsx`
- `app/api/pages/databases/shell/route.ts`

Limitations:

- Gallery card record-opening inside page canvas needs more manual QA.
- Some schema/global view mutations still use route refresh by design.

## Theme / Styling

Status: implemented/partial.

What it does:

- Saves shared workspace theme tokens.
- Saves personal theme overrides.
- Supports light, dark, and system mode.
- Supports reset-to-default tokens.
- Styles pages, widgets, and views through safe token options.
- Shows contrast warnings.
- Applies theme tokens through the app shell and page/portal surfaces.

Main files:

- `app/(workspace)/settings/theme/page.tsx`
- `app/settings/theme/actions.ts`
- `components/theme/theme-styling-engine.tsx`
- `components/theme-provider.tsx`
- `components/theme-mode-toggle.tsx`
- `lib/theme/*`

Limitations:

- Some saved view styles are not rendered everywhere.
- No arbitrary CSS/JS by design.

## AI Builder

Status: implemented/partial.

What it does:

- Chat UI with suggested prompts.
- Backend sends workspace context and schema to Gemini.
- Gemini returns structured JSON.
- Backend validates JSON, stores preview, and exposes it to UI.
- Apply only happens after confirmation.
- Undo can reverse recorded create/update operations.

Main files:

- `app/(workspace)/ai-builder/page.tsx`
- `components/ai-builder/ai-builder-chat.tsx`
- `app/api/ai-builder/chat/route.ts`
- `app/api/ai-builder/apply/route.ts`
- `app/api/ai-builder/undo/route.ts`
- `lib/ai-builder/*`

Limitations:

- Apply supports a defined subset of actions.
- No streaming.
- No cost logging.
- No model/provider abstraction.

## Templates

Status: placeholder.

What it does:

- Shows hardcoded template cards.

Main files:

- `app/(workspace)/templates/page.tsx`
- `sql/seed_templates_v1.sql`

Limitations:

- No real template installer.
- UI does not read seeded `templates`.

## Agents

Status: placeholder.

What it does:

- Shows a placeholder agent library and setup surface.

Main files:

- `app/(workspace)/agents/page.tsx`
- `sql/supabase_schema_v1.sql`
- `sql/seed_templates_v1.sql`

Limitations:

- No persisted agent instances in UI.
- No AI execution.
- No managed/internal visibility enforcement beyond route concept.

## Automations

Status: placeholder.

What it does:

- Shows static automation cards and status controls.

Main files:

- `app/(workspace)/automations/page.tsx`

Limitations:

- No persistence.
- No n8n integration yet.

## Portal Preview

Status: mock.

What it does:

- Renders a static portal preview.

Main files:

- `app/(workspace)/portal-preview/page.tsx`

Limitations:

- Not tied to real published pages/stacks yet.
- Sharing routes are realer than this preview route.

## Supabase Integration

Status: implemented/partial.

What it does:

- Provides browser, server, admin, proxy, and stateless auth clients.
- Uses generated/manual database types.
- Uses RLS read/share policies plus server-side service-role writes.

Main files:

- `lib/supabase/*`
- `lib/supabase/database.types.ts`
- `sql/*.sql`

Limitations:

- No formal migration runner is configured.
- Most write RLS policies are still deferred to server-side validation.
- `database.types.ts` must be kept in sync.

## n8n Placeholders

Status: planned/future.

Current state:

- `.env.example` includes `N8N_WEBHOOK_BASE_URL` and `N8N_WEBHOOK_SECRET`.
- `webhook_events` table exists.
- No route handler currently receives signed n8n webhooks.

## Google Drive and Email Placeholders

Status: planned/future.

Current state:

- `.env.example` includes Google client/picker variables.
- `.env.example` includes email provider variables.
- No code currently consumes these variables.
