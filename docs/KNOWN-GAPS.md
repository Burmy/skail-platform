# Known Gaps / Follow-ups

This file documents issues discovered during inspection and QA. It is intentionally not a hidden fix list; product/runtime fixes should be planned and tested separately.

## High Priority

### Write RLS is incomplete

Most domain tables have read/share RLS policies, but many insert/update/delete paths still rely on server actions/API routes validating access and then using the service role client.

Follow-up:

- Add formal role capabilities.
- Add write RLS policies aligned with workspace and page/share access.
- Keep server-side validation as defense in depth.

### Embedded page database polish still needs focused manual QA

The embedded database path has been improved with exact source/view identity, event isolation, local overrides, request caching, and in-flight request reuse. The highest-risk remaining area is gallery cards and record-sheet behavior inside the BlockNote page canvas.

Follow-up:

- Manually QA opening records from each embedded view type.
- Confirm gallery card title/open interactions are reliable inside BlockNote.
- Watch for repeated `/api/pages/databases/shell` calls while editing.

### Production signup policy needs a decision

Signup currently supports service-role auto-confirm and immediate login when configured. This is useful for local/internal setup but should be reviewed before public production signup.

Follow-up:

- Decide whether email confirmation is required in production.
- Add password reset.
- Add clear auth settings docs for deployment.

### TypeScript build errors are ignored in `next.config.mjs`

`next.config.mjs` sets `typescript.ignoreBuildErrors: true`, so `npm run build` can pass while TypeScript errors exist.

Follow-up:

- Run `npx tsc --noEmit` in CI.
- Remove `ignoreBuildErrors` when the project is ready.

## Medium Priority

### n8n webhook receiver is not implemented

Environment placeholders and `webhook_events` exist, but there is no route handler for signed n8n webhooks.

Follow-up:

- Add backend-only webhook route.
- Verify signatures with `N8N_WEBHOOK_SECRET`.
- Store events with `workspace_id`.

### Templates route is static

The route uses hardcoded cards and does not read the seeded `templates` table.

Follow-up:

- Load platform/workspace templates from Supabase.
- Implement template preview/install with confirmation.

### Agents route is static/placeholder

SQL exists for agent templates, instances, and logs, but the visible route does not use them.

Follow-up:

- Load `agent_templates` and `agent_instances`.
- Enforce internal/managed visibility rules.
- Add persistence for workspace-specific instructions.

### Automations route is static

The route uses hardcoded automation content. Switches and buttons are visual only.

Follow-up:

- Add persisted automation config or n8n-backed workflows.
- Wire controls to backend state.

### Portal preview is a mock

`/portal-preview` renders a static portal preview and does not use real shared pages/stacks.

Follow-up:

- Build real published portal rendering.
- Respect page visibility and workspace branding.

### Theme styles are not uniformly applied

Workspace theme is applied through the shell and page surfaces, and theme settings can be saved/reset. Some saved view style tokens may not be reflected in every renderer.

Follow-up:

- Audit every widget and view renderer.
- Confirm table header, kanban column, calendar event, gallery card, density, and status palette styles are applied consistently.

### Role model is hardcoded

Role checks are scattered in TypeScript helpers/actions.

Follow-up:

- Introduce `role_capabilities` or equivalent.
- Centralize permission checks for workspace roles and page/share access.

### SQL files overlap

Some module SQL files are patch-style and overlap with foundation SQL, especially `ai_builder_previews`.

Follow-up:

- Decide whether module SQL should be incremental only.
- Move to a migration workflow.

### `database.types.ts` sync process is undocumented in tooling

The type file exists and includes current tables, but there is no automated command in `package.json` for regenerating it.

Follow-up:

- Add Supabase CLI type generation instructions.
- Regenerate after schema changes.

### Lint warnings remain

`npm run lint` runs, but existing warnings remain. During QA it exited successfully with warnings, not errors.

Common categories:

- Hook dependency warnings in interactive components.
- `<img>` usage warnings where dynamic/user-provided image URLs are currently rendered.

Follow-up:

- Triage warnings by feature area.
- Avoid broad warning suppression unless the local reason is clear.

## Low Priority

### Legacy/static data remains in `lib/data.ts`

`lib/data.ts` still contains static navigation/support data and placeholder content. Some is still used by the sidebar and mock pages.

Follow-up:

- Keep navigation data intentional.
- Remove or isolate demo data once placeholder routes become real.

### Duplicate global CSS files

The app imports `app/globals.css`. `styles/globals.css` also exists and appears to be legacy or unused.

Follow-up:

- Confirm no import path uses `styles/globals.css`.
- Remove or document it when runtime cleanup is allowed.

### Legacy `widgets` table remains

The newer page editor stores BlockNote documents in `page_documents`, but `widgets` still exists from the earlier layout builder and is referenced by some theme/style surfaces.

Follow-up:

- Decide whether to migrate old widget data into BlockNote blocks.
- Retire legacy widget assumptions when safe.

### Some advanced property types are partial

`file`, `person`, `relation`, `formula_placeholder`, and newer view-specific behavior exist but are not uniformly complete.

Follow-up:

- Complete relation records, workspace people, storage-backed files, and formula evaluation UX as separate passes.

## Deployment Notes

- The repo currently uses `package-lock.json`.
- If Vercel is configured with a custom install command, make sure it matches the committed lockfile.
- Run `npx tsc --noEmit` separately because Next build currently ignores TypeScript errors.

## QA Notes From Latest Pass

Verified with browser smoke testing:

- Login.
- Main workspace dashboard.
- Pages, page trash, databases, templates, AI Builder, agents, automations, theme, workspace settings, portal preview, and workspace creation routes.
- Theme mode toggle.
- Mobile sidebar drawer.
- Standalone database dropdown interaction.
- Embedded database dropdown interaction.
- Embedded source switcher display.

Fixes made from QA:

- Sidebar Home now routes to the workspace dashboard.
- Embedded source switcher now displays actual collection/view names from loaded data.
- Record side sheet includes an accessible title.
- Embedded database requests use cache/in-flight reuse to reduce reload storms.
- Embedded database blocks isolate pointer/click events from BlockNote.
- Bad encoded loading/upload text was normalized.
