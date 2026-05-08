# Data Model

This document describes the tables present in `sql/*.sql` and how the current application uses them.

## Core Rule

Every tenant-owned table should include `workspace_id`. Current tenant-owned tables include:

- `workspace_members`
- `collections`
- `collection_fields`
- `collection_records`
- `record_values`
- `views`
- `pages`
- `widgets`
- `page_stacks`
- `page_documents`
- `page_visits`
- `page_forms`
- `page_form_submissions`
- `page_share_links`
- `page_access_grants`
- `page_share_events`
- `themes`
- `page_style_settings`
- `widget_style_settings`
- `view_style_settings`
- `ai_builder_previews`
- `templates` when workspace-specific
- `agent_instances`
- `agent_activity_logs`
- `webhook_events`
- database engine extension tables

`agent_templates` is platform-level and does not carry `workspace_id`.

## SQL Files

| File | Purpose | Notes |
| --- | --- | --- |
| `sql/supabase_schema_v1.sql` | Foundation schema. | Creates core workspace, database, page/widget, AI preview, template, agent, and webhook tables. |
| `sql/supabase_rls_v1.sql` | Baseline RLS policies. | Enables RLS and read policies based on active workspace membership. Writes are mostly guarded in server code. |
| `sql/supabase_theme_styling_v1.sql` | Theme/style module schema. | Adds `themes`, `page_style_settings`, `widget_style_settings`, and `view_style_settings`. |
| `sql/supabase_ai_builder_v1.sql` | AI Builder module patch. | Defines/updates `ai_builder_previews` and policies. Overlaps with `supabase_schema_v1.sql`. |
| `sql/supabase_pages_engine_v1.sql` | Notion-like page engine. | Adds stacks, documents, page visits, page forms, submissions, archive metadata, and page indexes. |
| `sql/supabase_page_sharing_v1.sql` | Page/stack sharing. | Adds public/invite links, accepted grants, audit events, sharing helpers, and sharing-aware RLS policies. |
| `sql/supabase_database_engine_v2.sql` | Database engine extensions. | Adds relation/file/form throttle tables and view/config indexes used by newer database views. |
| `sql/seed_templates_v1.sql` | Seed data. | Inserts platform templates and agent templates. Visible template/agent routes do not fully read these rows yet. |

## Workspace Tables

### `workspaces`

Tenant root table.

Key columns:

- `id`: stable workspace UUID.
- `name`: user-facing workspace name.
- `plan_key`: plan marker.
- `white_label_level`, `brand_name`, `brand_logo_url`, `accent_color`: white-label fields.
- `portal_subdomain`, `custom_domain`: portal address settings.
- `hide_skail_branding`: client-facing branding toggle.
- `email_from_name`, `email_from_address`: future branded email identity fields.

### `workspace_members`

Connects Supabase auth users to workspaces.

Key columns:

- `workspace_id`
- `user_id`
- `role_key`: currently strings such as `owner`, `admin`, `designer`, `editor`, `member`.
- `status`: active membership is expected to be `active`.

Unique on `(workspace_id, user_id)`.

## Database Tables

### `collections`

Workspace-scoped database definitions.

Key columns:

- `workspace_id`
- `name`, `description`, `icon`
- `is_locked`
- `archived_at` where database engine migrations are applied
- `created_by`

### `collection_fields`

Schema/properties for a collection.

Key columns:

- `workspace_id`
- `collection_id`
- `name`
- `field_type`
- `semantic_role`
- `is_required`, `is_locked`, `is_system`
- `options_json`
- `settings_json`
- `position`
- `archived_at` where database engine migrations are applied

Supported V1/V2 property types include:

`text`, `long_text`, `number`, `currency`, `select`, `multi_select`, `status`, `date`, `checkbox`, `url`, `email`, `phone`, `file`, `person`, `relation`, `formula_placeholder`, and newer view-specific helpers.

### `collection_records`

Rows/items in a collection.

Key columns:

- `workspace_id`
- `collection_id`
- `title`
- `created_by`
- `archived_at` where database engine migrations are applied

### `record_values`

Field values for records.

Key columns:

- `workspace_id`
- `record_id`
- `field_id`
- `value_json`, usually `{ "value": ... }`

Unique on `(record_id, field_id)`.

### `views`

Saved views over collections.

Key columns:

- `workspace_id`
- `collection_id`
- `name`
- `view_type`
- `config_json`
- `is_locked`
- `archived_at` where database engine migrations are applied

Views are now managed inside `/databases/[collectionId]`, not through a standalone `/views` route.

## Database Engine Extension Tables

### `collection_relations`

Defines relation metadata between collections.

### `collection_record_links`

Stores record-to-record relation links.

### `collection_files`

Stores uploaded file metadata for file fields. Actual bytes are stored in Supabase Storage.

### `form_submission_throttle`

Tracks public form submission throttling.

## Page Tables

### `pages`

Workspace page records.

Key columns:

- `workspace_id`
- `stack_id`
- `parent_page_id`
- `title`, `icon`, `cover_image_url`
- `is_locked`
- `visibility_scope`
- `position`
- `archived_at`

### `widgets`

Legacy page/widget layout table from the earlier layout builder.

Current state:

- Still exists in schema and some theme/style surfaces.
- New Notion-like pages primarily use `page_documents`.
- Keep this table until all old widget assumptions are removed or migrated.

### `page_stacks`

Groups pages in the sidebar.

Key columns:

- `workspace_id`
- `name`
- `position`
- `archived_at`

### `page_documents`

Stores one BlockNote document per page.

Key columns:

- `workspace_id`
- `page_id`
- `content_json`
- `version`
- `updated_by`

### `page_visits`

Stores per-user recent page activity.

Key columns:

- `workspace_id`
- `user_id`
- `page_id`
- `last_opened_at`

### `page_forms` and `page_form_submissions`

Support page-level form blocks and submissions.

Current state:

- Present for page form behavior.
- Public form routing also uses database form views under `/f/[slug]`.

## Page Sharing Tables

### `page_share_links`

Stores public and invite links.

Key columns:

- `workspace_id`
- `scope_type`: `page` or `stack`
- `scope_id`
- `link_type`: `invite` or `public`
- `access_level`: `view`, `edit`, or `manage`
- `token_hash`: hashed token only; raw tokens are not stored
- `created_by`
- `revoked_at`
- `last_used_at`

### `page_access_grants`

Stores accepted signed-in user access.

Key columns:

- `workspace_id`
- `user_id`
- `scope_type`
- `scope_id`
- `access_level`
- `source_link_id`
- `granted_by`
- `accepted_at`
- `revoked_at`

### `page_share_events`

Audit log for link creation, invite acceptance, revoke, and permission changes.

## Theme and Styling Tables

### `themes`

Stores shared workspace themes and personal overrides.

Key columns:

- `workspace_id`
- `user_id` for personal themes
- `mode`
- `tokens_json`
- `is_default`

### `page_style_settings`

Safe page/tab style settings, including background, spacing/density, icons, covers, and page image fields where supported.

### `widget_style_settings`

Safe style tokens for legacy widgets.

### `view_style_settings`

Safe style tokens for saved database views.

## AI Builder Tables

### `ai_builder_previews`

Stores AI Builder generated plans before and after apply.

Key columns:

- `workspace_id`
- `created_by`
- `user_prompt`
- `status`
- `intent`, `summary`, `risk_level`
- `requires_confirmation`
- `plan_json`
- `context_json`
- `applied_operations_json`

Used by `/api/ai-builder/chat`, `/apply`, and `/undo`.

## Templates and Agents

### `templates`

Platform or workspace templates. Current template route is still static and does not fully read this table.

### `agent_templates`

Platform-level agent template definitions.

### `agent_instances`

Workspace-scoped agent instances.

### `agent_activity_logs`

Workspace-scoped agent activity log rows.

Current visible agent route is a placeholder.

## Automation / Webhook Tables

### `webhook_events`

Intended for signed automation/webhook events such as n8n.

Current state:

- Table exists.
- No signed n8n receiver route exists.

## Workspace Scoping Rules

- Any ID passed into a mutation must be verified against the active `workspace_id`.
- Views must belong to the same collection/workspace.
- Records must belong to the same collection/workspace.
- Page documents must belong to the requested page/workspace.
- Embedded database mutations by shared users must verify that the database source is embedded in the page document.
- Public anonymous access should go through token-validated server routes, not broad public write RLS.

## RLS and Security Notes

- Baseline RLS policies are read-oriented for workspace membership.
- Page sharing SQL adds helper functions/policies for page/share reads.
- Most writes still use the service role after server-side validation.
- Service role must remain server-only.
- Share links store token hashes only.

## Seed Data Notes

`sql/seed_templates_v1.sql` seeds platform templates and agent templates. Current UI routes for templates and agents still use placeholder/static data instead of these tables.

## Known Follow-ups

- Add formal migration workflow.
- Regenerate `lib/supabase/database.types.ts` after schema changes.
- Complete write RLS policies.
- Centralize role/capability checks.
- Retire or migrate legacy `widgets` if the BlockNote page model fully replaces it.
