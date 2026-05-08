-- SKAIL Page / Stack Sharing v1
-- Adds tokenized public/invite links, accepted user grants, audit events,
-- and RLS helpers for page-scoped access.

create table if not exists public.page_share_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  scope_type text not null check (scope_type in ('page', 'stack')),
  scope_id uuid not null,
  link_type text not null check (link_type in ('invite', 'public')),
  access_level text not null check (access_level in ('view', 'edit', 'manage')),
  token_hash text not null unique,
  created_by uuid null,
  revoked_at timestamptz null,
  last_used_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists page_share_links_scope_idx
  on public.page_share_links(workspace_id, scope_type, scope_id)
  where revoked_at is null;

create index if not exists page_share_links_hash_idx
  on public.page_share_links(token_hash)
  where revoked_at is null;

create table if not exists public.page_access_grants (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null,
  scope_type text not null check (scope_type in ('page', 'stack')),
  scope_id uuid not null,
  access_level text not null check (access_level in ('view', 'edit', 'manage')),
  source_link_id uuid null references public.page_share_links(id) on delete set null,
  granted_by uuid null,
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists page_access_grants_user_idx
  on public.page_access_grants(workspace_id, user_id, scope_type, scope_id)
  where revoked_at is null;

create table if not exists public.page_share_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  scope_type text not null check (scope_type in ('page', 'stack')),
  scope_id uuid not null,
  event_type text not null,
  access_level text null,
  actor_user_id uuid null,
  target_user_id uuid null,
  link_id uuid null references public.page_share_links(id) on delete set null,
  grant_id uuid null references public.page_access_grants(id) on delete set null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists page_share_events_scope_idx
  on public.page_share_events(workspace_id, scope_type, scope_id, created_at desc);

alter table public.page_share_links enable row level security;
alter table public.page_access_grants enable row level security;
alter table public.page_share_events enable row level security;

create or replace function public.page_access_rank(access_level text)
returns integer
language sql
immutable
as $$
  select case access_level
    when 'manage' then 3
    when 'edit' then 2
    when 'view' then 1
    else 0
  end;
$$;

create or replace function public.can_access_page(
  target_workspace uuid,
  target_page uuid,
  minimum_access text default 'view'
)
returns boolean
language sql
security definer
stable
as $$
  with recursive ancestors as (
    select p.id, p.parent_page_id, p.stack_id
    from public.pages p
    where p.id = target_page
      and p.workspace_id = target_workspace
      and p.archived_at is null
    union all
    select parent.id, parent.parent_page_id, parent.stack_id
    from public.pages parent
    join ancestors child on child.parent_page_id = parent.id
    where parent.workspace_id = target_workspace
      and parent.archived_at is null
  )
  select
    public.is_workspace_member(target_workspace)
    or exists (
      select 1
      from public.page_access_grants grant_row
      join ancestors page_scope on true
      where grant_row.workspace_id = target_workspace
        and grant_row.user_id = auth.uid()
        and grant_row.revoked_at is null
        and public.page_access_rank(grant_row.access_level) >= public.page_access_rank(minimum_access)
        and (
          (grant_row.scope_type = 'page' and grant_row.scope_id = page_scope.id)
          or
          (grant_row.scope_type = 'stack' and grant_row.scope_id = page_scope.stack_id)
        )
    );
$$;

create or replace function public.can_access_stack(
  target_workspace uuid,
  target_stack uuid,
  minimum_access text default 'view'
)
returns boolean
language sql
security definer
stable
as $$
  select
    public.is_workspace_member(target_workspace)
    or exists (
      select 1
      from public.page_access_grants grant_row
      where grant_row.workspace_id = target_workspace
        and grant_row.user_id = auth.uid()
        and grant_row.revoked_at is null
        and grant_row.scope_type = 'stack'
        and grant_row.scope_id = target_stack
        and public.page_access_rank(grant_row.access_level) >= public.page_access_rank(minimum_access)
    );
$$;

drop policy if exists page_share_links_select_member on public.page_share_links;
create policy page_share_links_select_member on public.page_share_links
  for select using (public.is_workspace_member(workspace_id));

drop policy if exists page_access_grants_select_related on public.page_access_grants;
create policy page_access_grants_select_related on public.page_access_grants
  for select using (
    public.is_workspace_member(workspace_id)
    or user_id = auth.uid()
  );

drop policy if exists page_share_events_select_member on public.page_share_events;
create policy page_share_events_select_member on public.page_share_events
  for select using (public.is_workspace_member(workspace_id));

drop policy if exists "members can view pages" on public.pages;
create policy "members and page grants can view pages"
on public.pages for select
using (
  public.is_workspace_member(workspace_id)
  or public.can_access_page(workspace_id, id, 'view')
);

drop policy if exists page_stacks_select on public.page_stacks;
create policy page_stacks_select on public.page_stacks
  for select using (
    public.is_workspace_member(workspace_id)
    or public.can_access_stack(workspace_id, id, 'view')
    or exists (
      select 1
      from public.pages p
      where p.workspace_id = page_stacks.workspace_id
        and p.stack_id = page_stacks.id
        and public.can_access_page(p.workspace_id, p.id, 'view')
    )
  );

drop policy if exists page_documents_select on public.page_documents;
create policy page_documents_select on public.page_documents
  for select using (public.can_access_page(workspace_id, page_id, 'view'));

drop policy if exists page_forms_select on public.page_forms;
create policy page_forms_select on public.page_forms
  for select using (public.can_access_page(workspace_id, page_id, 'view'));

drop policy if exists page_form_submissions_select on public.page_form_submissions;
create policy page_form_submissions_select on public.page_form_submissions
  for select using (public.is_workspace_member(workspace_id));

drop policy if exists "members can view their workspaces" on public.workspaces;
create policy "members and page grants can view workspaces"
on public.workspaces for select
using (
  public.is_workspace_member(id)
  or exists (
    select 1
    from public.page_access_grants grant_row
    where grant_row.workspace_id = workspaces.id
      and grant_row.user_id = auth.uid()
      and grant_row.revoked_at is null
  )
);

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'page_assets_select_page_grant'
  ) then
    create policy page_assets_select_page_grant on storage.objects
      for select using (
        bucket_id = 'page-assets'
        and split_part(storage.objects.name, '/', 2) ~* '^[0-9a-f-]{36}$'
        and public.can_access_page(
          split_part(storage.objects.name, '/', 1)::uuid,
          split_part(storage.objects.name, '/', 2)::uuid,
          'view'
        )
      );
  end if;
end $$;
