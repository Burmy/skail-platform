-- SKAIL AI Builder Schema v1
-- Run in Supabase SQL editor after the foundation schema.

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

alter table ai_builder_previews enable row level security;

drop policy if exists "members can view ai builder previews"
on ai_builder_previews;

create policy "members can view ai builder previews"
on ai_builder_previews for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can create their ai builder previews"
on ai_builder_previews;

create policy "members can create their ai builder previews"
on ai_builder_previews for insert
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);
