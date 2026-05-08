# Data Model

This document describes the tables present in `sql/*.sql` and how the current application uses them.

## Core Rule

Every tenant-owned table should include `workspace_id`. Current tenant-owned tables do this:

- `workspace_members`
- `collections`
- `collection_fields`
- `collection_records`
- `record_values`
- `views`
- `pages`
- `widgets`
- `ai_builder_previews`
- `templates` when workspace-specific
- `agent_instances`
- `agent_activity_logs`
- `webhook_events`
- theme/style tables

`agent_templates` is platform-level and does not carry `workspace_id`.

## SQL Files

| File | Purpose | Notes |
| --- | --- | --- |
| `sql/supabase_schema_v1.sql` | Foundation schema. | Creates core workspace, database, page, AI preview, template, agent, and webhook tables. |
| `sql/supabase_rls_v1.sql` | RLS policies. | Enables RLS and adds read policies based on active workspace membership. Writes are intentionally mostly handled server-side with service role after validation. |
| `sql/supabase_theme_styling_v1.sql` | Theme/style module schema. | Adds `themes`, `page_style_settings`, `widget_style_settings`, and `view_style_settings`. |
| `sql/supabase_ai_builder_v1.sql` | AI Builder module patch. | Defines/updates `ai_builder_previews` and its policies. This overlaps with `supabase_schema_v1.sql`. |
| `sql/seed_templates_v1.sql` | Seed data. | Inserts platform templates and agent templates. Visible template/agent routes do not currently read these rows. |

## Tables

### `workspaces`

Tenant root table.

Key columns:

| Column | Purpose |
| --- | --- |
| `id` | Stable workspace UUID. |
| `name` | User-facing workspace name. |
| `plan_key` | Plan marker, default `diy`. |
| `white_label_level` | White-label capability level. |
| `brand_name`, `brand_logo_url`, `accent_color` | Brand display fields. |
| `portal_subdomain`, `custom_domain` | Portal address settings, unique. |
| `hide_skail_branding` | Client-facing branding toggle. |
| `email_from_name`, `email_from_address` | Future branded email identity fields. |

Used by workspace dashboard, workspace settings, sidebar branding, theme scoping, and all workspace ownership checks.

### `workspace_members`

Connects Supabase auth users to workspaces.

Key columns:

| Column | Purpose |
| --- | --- |
| `workspace_id` | Tenant boundary. |
| `user_id` | Supabase Auth user ID. |
| `role_key` | Hardcoded role string such as `owner`, `admin`, `designer`, `editor`, `member`. |
| `status` | Expected active value is `active`. |

Unique on `(workspace_id, user_id)`.

Current role logic is implemented in TypeScript, not a role capability table.

### `collections`

Workspace-scoped database definitions.

Key columns:

| Column | Purpose |
| --- | --- |
| `workspace_id` | Tenant boundary. |
| `name`, `description`, `icon` | User-facing collection metadata. |
| `is_locked` | Reserved/used to prevent some changes. |
| `created_by` | Auth user who created it. |

Collections have fields and records.

### `collection_fields`

Schema/properties for a collection.

Key columns:

| Column | Purpose |
| --- | --- |
| `workspace_id` | Tenant boundary. |
| `collection_id` | Parent collection. |
| `name` | User-facing field name. |
| `field_type` | One of the V1 property types in `lib/properties/types.ts`. |
| `semantic_role` | Optional role such as `title` or `created_at`. |
| `is_required`, `is_locked`, `is_system` | Field behavior flags. |
| `options_json` | Select/status/multi-select option data. |
| `settings_json` | Reserved field settings. |
| `position` | Field ordering. |

Supported property types:

`text`, `long_text`, `number`, `currency`, `select`, `multi_select`, `status`, `date`, `checkbox`, `url`, `email`, `phone`, `file`, `person`, `relation`, `formula_placeholder`.

New collections create two system fields:

- `Record title` with `semantic_role = title`
- `Created at` with `semantic_role = created_at`

Normal users do not see system fields in the database engine; owners/admins can.

### `collection_records`

Rows/items in a collection.

Key columns:

| Column | Purpose |
| --- | --- |
| `workspace_id` | Tenant boundary. |
| `collection_id` | Parent collection. |
| `title` | Record display title. |
| `created_by` | Auth user who created it. |

### `record_values`

Field values for records.

Key columns:

| Column | Purpose |
| --- | --- |
| `workspace_id` | Tenant boundary. |
| `record_id` | Parent record. |
| `field_id` | Field being stored. |
| `value_json` | JSON object, usually `{ "value": ... }`. |

Unique on `(record_id, field_id)`.

### `views`

Saved views over collections.

Key columns:

| Column | Purpose |
| --- | --- |
| `workspace_id` | Tenant boundary. |
| `collection_id` | Collection being viewed. |
| `name` | User-facing view name. |
| `view_type` | `table`, `kanban`, `calendar`, or `dashboard`. |
| `config_json` | Visible fields, filters, sorts, kanban/calendar field IDs. |
| `is_locked` | Prevents some updates. |

`config_json` is parsed by `lib/views/types.ts`.

### `pages`

Workspace page/tab records.

Key columns:

| Column | Purpose |
| --- | --- |
| `workspace_id` | Tenant boundary. |
| `parent_page_id` | Optional nested page relation. Current UI is mostly flat. |
| `title`, `icon` | Page display metadata. |
| `is_locked` | Prevents some updates. |
| `visibility_scope` | Defaults to `workspace`; future portal/client scopes can use this. |
| `position` | Ordering. |

### `widgets`

Widgets on pages.

Key columns:

| Column | Purpose |
| --- | --- |
| `workspace_id` | Tenant boundary. |
| `page_id` | Parent page. |
| `widget_type` | One of `text`, `heading`, `table`, `kanban`, `calendar`, `kpi_card`, `file_links`, `embed`, `activity_feed`. |
| `title` | Widget title. |
| `data_source_type` | `collection`, `view`, or null. |
| `data_source_id` | UUID of collection or view. |
| `config_json` | Widget-specific config. |
| `position` | Ordering within page. |

### `ai_builder_previews`

Stores AI Builder generated plans before and after apply.

Key columns:

| Column | Purpose |
| --- | --- |
| `workspace_id` | Tenant boundary. |
| `created_by` | Auth user who generated the preview. |
| `user_prompt` | User prompt text. |
| `status` | `preview`, `applied`, `undone`, or `failed`. |
| `intent`, `summary`, `risk_level` | Human-readable preview metadata. |
| `requires_confirmation` | Always normalized to true by current code. |
| `plan_json` | Validated AI plan JSON. |
| `context_json` | Workspace context sent to AI. |
| `applied_operations_json` | Operations recorded for undo. |

Used by `/api/ai-builder/chat`, `/apply`, and `/undo`.

### `templates`

Platform or workspace templates.

Key columns:

| Column | Purpose |
| --- | --- |
| `workspace_id` | Nullable; null means platform template. |
| `name` | Template name. |
| `template_type` | Example values: `workspace`, `portal`. |
| `config_json` | Template config payload. |
| `is_platform_template` | Platform-level template marker. |

Seeded by `seed_templates_v1.sql`. The `/templates` UI currently uses hardcoded route data instead of this table.

### `agent_templates`

Platform agent definitions.

Key columns:

| Column | Purpose |
| --- | --- |
| `name`, `description` | Agent metadata. |
| `locked_rules` | Non-editable safety/rule text. |
| `default_instructions` | Starting instructions. |
| `allowed_actions_json` | Allowed action keys. |
| `is_platform_agent` | Platform-level marker. |

Seeded by `seed_templates_v1.sql`. The `/agents` UI currently uses `lib/data.ts`.

### `agent_instances`

Workspace-specific agent instances.

Key columns:

| Column | Purpose |
| --- | --- |
| `workspace_id` | Tenant boundary. |
| `agent_template_id` | Optional template source. |
| `display_name` | Workspace-facing agent name. |
| `user_instructions` | Workspace-specific instructions. |
| `is_enabled` | Enabled flag. |

Currently only counted on the workspace dashboard.

### `agent_activity_logs`

Workspace-scoped activity log for future agent events.

Key columns:

| Column | Purpose |
| --- | --- |
| `workspace_id` | Tenant boundary. |
| `agent_instance_id` | Agent that produced the event. |
| `event_type`, `summary` | Event metadata. |
| `payload_json` | Raw event payload. |
| `visibility_scope` | Defaults to `internal`. |

No visible route currently writes or reads this table.

### `webhook_events`

Workspace-scoped webhook inbox for future n8n integrations.

Key columns:

| Column | Purpose |
| --- | --- |
| `workspace_id` | Tenant boundary. |
| `source` | External source, expected future value includes n8n. |
| `event_type` | Event classification. |
| `payload_json` | Raw payload. |
| `status` | Defaults to `received`. |

No n8n receiver is implemented yet.

## Theme and Styling Tables

### `themes`

Workspace theme tokens.

Key columns:

| Column | Purpose |
| --- | --- |
| `workspace_id` | Tenant boundary. |
| `name` | Theme display name. |
| `mode` | `light`, `dark`, or `system`. |
| `is_default` | Shared workspace default marker. |
| `tokens_json` | Safe theme token object. |

The app supports shared and personal token scopes inside `tokens_json`.

### `page_style_settings`

Per-page style settings.

Key columns:

| Column | Purpose |
| --- | --- |
| `page_id` | Unique page relation. |
| `cover_image_url` | Safe URL string. |
| `icon_type`, `icon_value` | Page icon metadata. |
| `background_json`, `typography_json`, `layout_style_json` | Safe style objects. |

### `widget_style_settings`

Per-widget style settings.

Key columns:

| Column | Purpose |
| --- | --- |
| `widget_id` | Unique widget relation. |
| `style_json` | Safe widget style object. |

### `view_style_settings`

Per-view style settings.

Key columns:

| Column | Purpose |
| --- | --- |
| `view_id` | Unique view relation. |
| `style_json` | Safe view style object. |

## RLS and Security Notes

- `supabase_rls_v1.sql` enables RLS on foundation tables.
- `supabase_theme_styling_v1.sql` enables RLS on theme/style tables.
- Read policies allow active workspace members to select workspace data.
- `templates` are readable when `workspace_id is null` or user is a workspace member.
- AI Builder preview insert policy requires active workspace membership and `created_by = auth.uid()`.
- Write policies for most domain tables are not implemented in SQL yet. The app writes from trusted server code with the service role key after membership/role checks.
- The helper `public.is_workspace_member` is `security definer` and lives in the public schema. This is functional but should be reviewed before production hardening.

## Indexes, Constraints, and Follow-ups

Existing constraints:

- Primary keys on all tables.
- `workspace_members` unique on `(workspace_id, user_id)`.
- `record_values` unique on `(record_id, field_id)`.
- Style setting tables unique on their target ID.
- Workspace `portal_subdomain` and `custom_domain` unique.

Potential follow-ups:

- Add indexes for common lookups: `workspace_id`, `(workspace_id, collection_id)`, `(workspace_id, page_id)`, `(workspace_id, user_id)`.
- Add stricter check constraints for enum-like fields such as `role_key`, `field_type`, `view_type`, `widget_type`, `visibility_scope`, and `template_type`.
- Add write RLS policies once role capabilities are formalized.
- Resolve duplicate `ai_builder_previews` definitions between schema and module SQL.
- Add migrations instead of only SQL editor scripts once schema stabilizes.
