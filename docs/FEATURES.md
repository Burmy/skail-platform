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

Main files:

- `app/page.tsx`
- `app/workspaces/new/page.tsx`
- `app/workspaces/[workspaceId]/page.tsx`
- `app/workspaces/[workspaceId]/settings/page.tsx`
- `app/workspaces/actions.ts`
- `lib/workspaces/queries.ts`
- `components/workspaces/*`

Data source:

- `workspaces`
- `workspace_members`
- Counts from `collections`, `pages`, `views`, `agent_instances`

User flow:

1. User signs up or logs in.
2. `/` redirects to first workspace or `/workspaces/new`.
3. User creates a workspace.
4. Creator becomes owner.
5. Dashboard and settings become available.

Limitations:

- No invite/team-management UI.
- Roles are strings, not backed by a formal capabilities table.
- Owner/admin checks are implemented in code.

Suggested next steps:

- Add member invitation and management.
- Add role capabilities table.
- Add workspace switching UX beyond the simple dropdown.

## Auth

Status: implemented/partial.

What it does:

- Login with email/password.
- Signup with optional server-side auto-confirm if service role is configured.
- Logout.
- Auth callback exchange for normal Supabase email confirmation flow.
- Proxy refresh and redirect for unauthenticated app routes.

Main files:

- `app/login/page.tsx`
- `app/signup/page.tsx`
- `app/auth/actions.ts`
- `app/auth/callback/route.ts`
- `proxy.ts`
- `lib/supabase/proxy.ts`
- `lib/supabase/server.ts`

Data source:

- Supabase Auth.
- `workspace_members` for app authorization after auth.

Limitations:

- No password reset UI.
- No OAuth providers.
- Auto-confirm signup requires service role key and should be reviewed for production policy.

Suggested next steps:

- Add password reset.
- Add production auth policy around email confirmation.
- Add clearer auth error states.

## Databases / Collections

Status: implemented/partial.

What it does:

- Create/rename collections.
- Create fields/properties.
- Rename/change field type with warning.
- Add options to select/status/multi-select fields.
- Hide system fields from normal users.
- Create/update basic records.
- Preserve stable field IDs while names change.
- Supports `semantic_role`.

Main files:

- `app/databases/page.tsx`
- `app/databases/actions.ts`
- `components/properties/property-engine.tsx`
- `lib/properties/queries.ts`
- `lib/properties/types.ts`

Data source:

- `collections`
- `collection_fields`
- `collection_records`
- `record_values`

Limitations:

- File/person/relation/formula types are mostly placeholders.
- There is no delete UI.
- Field type changes do not migrate existing values beyond storing JSON.
- Record editing is basic and inline.

Suggested next steps:

- Add richer field-specific editors.
- Add relation/person/file implementations.
- Add import/export and deletion with confirmation.

## Views

Status: implemented/partial.

What it does:

- Create views for collections.
- Rename and duplicate views.
- Change view type.
- Configure visible fields.
- Configure filters and sorts.
- Configure kanban group field.
- Configure calendar date field.
- Shows guided errors when kanban/calendar required field types are missing.

Main files:

- `app/views/page.tsx`
- `app/views/actions.ts`
- `components/views/view-engine.tsx`
- `lib/views/queries.ts`
- `lib/views/types.ts`

Data source:

- `views`
- Collection/field/record data from the property engine query path.

Limitations:

- Dashboard view type is a placeholder.
- Filter/sort operations are limited and applied in UI data shaping.
- No sharing or per-user view permissions.

Suggested next steps:

- Add advanced operators.
- Add persisted grouping/sizing/display options.
- Implement dashboard view or rename it as placeholder in UI.

## Layout Builder

Status: implemented/partial.

What it does:

- Create page/tab.
- Rename page/tab.
- Duplicate page with three modes:
  - layout only
  - layout plus empty database structure
  - everything including records
- Add widgets.
- Update widget title/source/config.
- Reorder widgets.
- Connect widgets to collections or views.
- Render simple previews for table, kanban, calendar, KPI, text, heading, file links, embed, and activity feed.

Main files:

- `app/pages/page.tsx`
- `app/pages/actions.ts`
- `components/layout-builder/layout-builder.tsx`
- `lib/layout/queries.ts`
- `lib/layout/types.ts`

Data source:

- `pages`
- `widgets`
- Collection/view tables for connected widgets
- Style tables for page/widget styling

Limitations:

- No drag-and-drop; reorder uses up/down actions.
- Some widget types are display placeholders.
- Page nesting exists in schema but is not a complete UI.

Suggested next steps:

- Add drag-and-drop.
- Add routeable page preview/client portal rendering.
- Add widget-specific config forms.

## Theme / Styling

Status: implemented/partial.

What it does:

- Save shared workspace theme tokens.
- Save personal theme overrides.
- Set mode, fonts, accent/background/card/button/link/highlight colors.
- Rename/style pages.
- Style widgets and views with safe option tokens.
- Shows contrast warnings.
- Applies workspace theme to `DashboardLayout`.

Main files:

- `app/settings/theme/page.tsx`
- `app/settings/theme/actions.ts`
- `components/theme/theme-styling-engine.tsx`
- `lib/theme/*`

Data source:

- `themes`
- `page_style_settings`
- `widget_style_settings`
- `view_style_settings`

Limitations:

- Theme application is scoped to dashboard shell and routed workspace surfaces.
- Some view style settings are saved but not fully reflected in every preview.
- No arbitrary CSS/JS by design.

Suggested next steps:

- Audit every widget/view renderer for style token application.
- Add accessible preset palettes.
- Add theme preview history or reset controls.

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

- `app/ai-builder/page.tsx`
- `components/ai-builder/ai-builder-chat.tsx`
- `app/api/ai-builder/chat/route.ts`
- `app/api/ai-builder/apply/route.ts`
- `app/api/ai-builder/undo/route.ts`
- `lib/ai-builder/*`
- `ai_builder_json_contract.json` is referenced by project context but the runtime contract currently lives in `lib/ai-builder/contract.ts`.

Data source:

- `ai_builder_previews`
- Existing workspace data from layout builder context
- Gemini API

Limitations:

- Apply supports a defined subset of actions.
- Layout reordering from AI is preview-only.
- No streaming.
- No cost logging.
- No model/provider abstraction.

Suggested next steps:

- Add preview diff rendering.
- Expand supported actions carefully.
- Add audit trail and cost/latency metrics.

## Templates

Status: placeholder.

What it does:

- Shows hardcoded template cards.

Main files:

- `app/templates/page.tsx`
- `sql/seed_templates_v1.sql`

Data source:

- Current route uses static array.
- SQL seeds `templates`, but UI does not read it.

Limitations:

- No template installer.
- No workspace-specific template loading.

Suggested next steps:

- Replace static cards with Supabase `templates`.
- Implement installer with preview/confirmation.

## Agents

Status: placeholder.

What it does:

- Shows static agent library.
- Allows local instruction editing UI.

Main files:

- `app/agents/page.tsx`
- `lib/data.ts`
- `sql/supabase_schema_v1.sql`
- `sql/seed_templates_v1.sql`

Data source:

- Current route uses `lib/data.ts`.
- SQL has `agent_templates`, `agent_instances`, and `agent_activity_logs`.

Limitations:

- No persisted agent instances.
- No AI execution.
- No managed/internal visibility enforcement in UI.

Suggested next steps:

- Load `agent_templates` and `agent_instances`.
- Add internal/client-facing visibility rules.
- Add execution logs.

## Automations

Status: placeholder.

What it does:

- Shows static automation cards and stats.

Main files:

- `app/automations/page.tsx`

Data source:

- Static array in route file.

Limitations:

- No persistence.
- Switches and buttons are not wired.
- No n8n integration yet.

Suggested next steps:

- Add automation tables or use `webhook_events` plus n8n config.
- Add signed webhook receiver.

## Portal Preview

Status: mock.

What it does:

- Renders a static Acme Corp portal preview with checklist, stats, activity, and quick links.

Main files:

- `app/portal-preview/page.tsx`
- `lib/data.ts`

Data source:

- Static `activityFeed` and `onboardingChecklist`.

Limitations:

- Not tied to workspace, pages, widgets, or theme.
- Not a real client-facing portal route.

Suggested next steps:

- Render workspace pages with portal-safe visibility.
- Apply workspace white-label and theme settings.

## Supabase Integration

Status: implemented/partial.

What it does:

- Provides browser, server, admin, proxy, and stateless auth clients.
- Uses generated/manual database types.
- Uses RLS read policies plus server-side service-role writes.

Main files:

- `lib/supabase/*`
- `lib/supabase/database.types.ts`
- `sql/*.sql`

Limitations:

- No migration system is configured.
- Most write RLS policies are deferred.
- `database.types.ts` must be kept in sync manually or regenerated.

Suggested next steps:

- Add a migration workflow.
- Add role capability tables and write policies.
- Add Supabase type generation instructions.

## n8n Placeholders

Status: planned/future.

Current state:

- `.env.example` includes `N8N_WEBHOOK_BASE_URL` and `N8N_WEBHOOK_SECRET`.
- `webhook_events` table exists.
- No route handler currently receives signed n8n webhooks.

Suggested next steps:

- Add `/api/n8n/webhook` or similar route.
- Verify signatures server-side.
- Store events in `webhook_events`.

## Google Drive and Email Placeholders

Status: planned/future.

Current state:

- `.env.example` includes Google client/picker variables.
- `.env.example` includes email provider variables.
- No code currently consumes these variables.

Suggested next steps:

- Add integration-specific backend routes.
- Store provider configuration securely.
- Keep provider secrets server-side only.
