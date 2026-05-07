-- SKAIL Supabase Schema v1
-- Run in Supabase SQL editor.

create extension if not exists "uuid-ossp";

create table if not exists workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  plan_key text default 'diy',
  white_label_level integer default 0,
  brand_name text,
  brand_logo_url text,
  accent_color text,
  portal_subdomain text unique,
  custom_domain text unique,
  hide_skail_branding boolean default false,
  email_from_name text,
  email_from_address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists workspace_members (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid not null,
  role_key text not null default 'member',
  status text not null default 'active',
  created_at timestamptz default now(),
  unique(workspace_id, user_id)
);

create table if not exists collections (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  description text,
  icon text,
  is_locked boolean default false,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists collection_fields (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  collection_id uuid references collections(id) on delete cascade,
  name text not null,
  field_type text not null,
  semantic_role text,
  is_required boolean default false,
  is_locked boolean default false,
  is_system boolean default false,
  options_json jsonb default '{}'::jsonb,
  settings_json jsonb default '{}'::jsonb,
  position integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists collection_records (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  collection_id uuid references collections(id) on delete cascade,
  title text,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists record_values (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  record_id uuid references collection_records(id) on delete cascade,
  field_id uuid references collection_fields(id) on delete cascade,
  value_json jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(record_id, field_id)
);

create table if not exists views (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  collection_id uuid references collections(id) on delete cascade,
  name text not null,
  view_type text not null default 'table',
  config_json jsonb default '{}'::jsonb,
  is_locked boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists pages (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  parent_page_id uuid references pages(id) on delete set null,
  title text not null,
  icon text,
  is_locked boolean default false,
  visibility_scope text default 'workspace',
  position integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists widgets (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  page_id uuid references pages(id) on delete cascade,
  widget_type text not null,
  title text,
  data_source_type text,
  data_source_id uuid,
  config_json jsonb default '{}'::jsonb,
  position integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ai_builder_previews (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  created_by uuid not null,
  user_prompt text not null,
  status text not null default 'preview'
    check (status in ('preview', 'applied', 'undone', 'failed')),
  intent text not null,
  summary text not null,
  risk_level text not null check (risk_level in ('low', 'medium', 'high')),
  requires_confirmation boolean not null default true,
  plan_json jsonb not null default '{}'::jsonb,
  context_json jsonb not null default '{}'::jsonb,
  applied_operations_json jsonb not null default '[]'::jsonb,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  applied_at timestamptz,
  undone_at timestamptz
);

create table if not exists templates (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete set null,
  name text not null,
  template_type text default 'workspace',
  config_json jsonb default '{}'::jsonb,
  is_platform_template boolean default false,
  created_at timestamptz default now()
);

create table if not exists agent_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  locked_rules text not null,
  default_instructions text,
  allowed_actions_json jsonb default '[]'::jsonb,
  is_platform_agent boolean default true,
  created_at timestamptz default now()
);

create table if not exists agent_instances (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  agent_template_id uuid references agent_templates(id),
  display_name text not null,
  user_instructions text,
  is_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists agent_activity_logs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  agent_instance_id uuid references agent_instances(id) on delete set null,
  event_type text not null,
  summary text,
  payload_json jsonb default '{}'::jsonb,
  visibility_scope text default 'internal',
  created_at timestamptz default now()
);

create table if not exists webhook_events (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  source text not null,
  event_type text not null,
  payload_json jsonb default '{}'::jsonb,
  status text default 'received',
  created_at timestamptz default now()
);
