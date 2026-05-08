# Known Gaps / Follow-ups

This file documents issues discovered during repository inspection. It is intentionally not a fix list for this documentation task.

## High Priority

### Write RLS is incomplete

Most domain tables have read RLS policies, but insert/update/delete policies are deferred. Current writes rely on server actions/API routes validating membership and then using the service role client.

Follow-up:

- Add formal role capabilities.
- Add write RLS policies aligned with those capabilities.
- Keep server-side validation as defense in depth.

### n8n webhook receiver is not implemented

Environment placeholders and `webhook_events` exist, but there is no route handler for signed n8n webhooks.

Follow-up:

- Add backend-only webhook route.
- Verify signatures with `N8N_WEBHOOK_SECRET`.
- Store events with `workspace_id`.

### Production signup policy needs a decision

Signup currently supports service-role auto-confirm and immediate login when configured. This is useful for local/internal setup but should be reviewed before public production signup.

Follow-up:

- Decide whether email confirmation is required in production.
- Add password reset.
- Add clear auth settings docs for deployment.

### TypeScript build errors are ignored in `next.config.mjs`

`next.config.mjs` sets:

```js
typescript: {
  ignoreBuildErrors: true,
}
```

This means `npm run build` can pass while TypeScript errors exist.

Follow-up:

- Run `npx tsc --noEmit --incremental false` in CI.
- Remove `ignoreBuildErrors` when the project is ready.

## Medium Priority

### Templates route is static

The route uses a hardcoded array and does not read the seeded `templates` table.

Follow-up:

- Load platform/workspace templates from Supabase.
- Implement template preview/install with confirmation.

### Agents route is static

The UI uses static `agents` from `lib/data.ts`. SQL exists for agent templates, instances, and logs, but the route does not use them.

Follow-up:

- Load `agent_templates` and `agent_instances`.
- Enforce internal/managed visibility rules.
- Add persistence for workspace-specific instructions.

### Automations route is static

The route uses a hardcoded `automations` array. Switches and buttons are visual only.

Follow-up:

- Add persisted automation config or n8n-backed workflows.
- Wire controls to backend state.

### Portal preview is a mock

`/portal-preview` renders a static Acme Corp portal and does not use real workspace pages, widgets, white-label settings, or theme.

Follow-up:

- Build real client-facing portal rendering.
- Respect page visibility and workspace branding.

### Theme styles are not uniformly applied

Workspace theme is applied through `DashboardLayout`, and layout builder uses some page/widget style data. Some saved view style tokens may not be reflected everywhere.

Follow-up:

- Audit every widget and view renderer.
- Confirm table header, kanban column, calendar event, density, and status palette styles are applied consistently.

### SQL files overlap

`ai_builder_previews` is defined in both `supabase_schema_v1.sql` and `supabase_ai_builder_v1.sql`.

Follow-up:

- Decide whether module SQL should be incremental only.
- Move to a migration workflow.

### `database.types.ts` sync process is undocumented

The type file exists and includes current tables, but there is no command or workflow for regenerating it.

Follow-up:

- Add Supabase CLI type generation instructions.
- Regenerate after schema changes.

### Role model is hardcoded

Role checks are scattered in TypeScript helpers/actions.

Follow-up:

- Introduce `role_capabilities` or equivalent.
- Centralize permission checks.

## Low Priority

### Legacy/static data remains in `lib/data.ts`

`lib/data.ts` contains static collections, widgets, agents, activity feed, checklist, and prompts. Some are used by placeholder pages, while persisted engines use Supabase.

Follow-up:

- Remove or clearly isolate demo data once placeholder routes become real.

### Duplicate global CSS files

The app imports `app/globals.css`. `styles/globals.css` also exists and appears to be legacy or unused.

Follow-up:

- Confirm no import path uses `styles/globals.css`.
- Remove or document it when runtime changes are allowed.

### Placeholder widget behavior

Several widget types exist but have simple previews or placeholder config behavior.

Follow-up:

- Add widget-specific configuration and rendering for `kpi_card`, `file_links`, `activity_feed`, and richer embeds.

### Limited relation/person/file field behavior

Property types exist for `file`, `person`, `relation`, and `formula_placeholder`, but the actual storage/UX semantics are not complete.

Follow-up:

- Implement real relation records, workspace people, storage-backed files, and formula evaluation when needed.

### Search UI is visual only

The sidebar search control is present but not connected to command/search behavior.

Follow-up:

- Add command palette/search backed by workspace pages, collections, views, and records.

### Docs were missing before this task

There was no `README.md` or `docs/` folder when this pass started.

Follow-up:

- Keep docs updated with every module change.

## Deployment Notes

- The repo currently uses `package-lock.json`. A stale `pnpm-lock.yaml` previously caused Vercel to use pnpm and fail install with a frozen lockfile mismatch.
- If Vercel is configured with a custom install command, make sure it matches the committed lockfile.

## Validation Gaps

This documentation pass inspects code and SQL. It does not exercise every UI flow or database mutation.

Recommended ongoing validation:

- `npm run lint`
- `npx tsc --noEmit --incremental false`
- `npm run build`
- Browser smoke tests for auth, workspace creation, databases, views, pages, theme, and AI Builder.
