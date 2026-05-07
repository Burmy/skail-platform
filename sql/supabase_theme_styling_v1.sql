-- SKAIL Theme + Styling Engine v1
-- Run after supabase_rls_v1.sql and before seed_templates_v1.sql.

create table if not exists themes (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  mode text not null default 'light',
  is_default boolean default false,
  tokens_json jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists page_style_settings (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  page_id uuid references pages(id) on delete cascade,
  theme_id uuid references themes(id) on delete set null,
  cover_image_url text,
  icon_type text,
  icon_value text,
  background_json jsonb default '{}'::jsonb,
  typography_json jsonb default '{}'::jsonb,
  layout_style_json jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(page_id)
);

create table if not exists widget_style_settings (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  widget_id uuid references widgets(id) on delete cascade,
  style_json jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(widget_id)
);

create table if not exists view_style_settings (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) on delete cascade,
  view_id uuid references views(id) on delete cascade,
  style_json jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(view_id)
);

alter table themes enable row level security;
alter table page_style_settings enable row level security;
alter table widget_style_settings enable row level security;
alter table view_style_settings enable row level security;

create policy "members can view themes"
on themes for select
using (public.is_workspace_member(workspace_id));

create policy "members can view page styles"
on page_style_settings for select
using (public.is_workspace_member(workspace_id));

create policy "members can view widget styles"
on widget_style_settings for select
using (public.is_workspace_member(workspace_id));

create policy "members can view view styles"
on view_style_settings for select
using (public.is_workspace_member(workspace_id));
