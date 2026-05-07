-- SKAIL RLS v1

alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table collections enable row level security;
alter table collection_fields enable row level security;
alter table collection_records enable row level security;
alter table record_values enable row level security;
alter table views enable row level security;
alter table pages enable row level security;
alter table widgets enable row level security;
alter table ai_builder_previews enable row level security;
alter table templates enable row level security;
alter table agent_instances enable row level security;
alter table agent_activity_logs enable row level security;
alter table webhook_events enable row level security;

-- Helper: user belongs to workspace
create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from workspace_members wm
    where wm.workspace_id = target_workspace
    and wm.user_id = auth.uid()
    and wm.status = 'active'
  );
$$;

-- Basic member policies
create policy "members can view their workspaces"
on workspaces for select
using (public.is_workspace_member(id));

create policy "members can view workspace members"
on workspace_members for select
using (public.is_workspace_member(workspace_id));

create policy "members can view collections"
on collections for select
using (public.is_workspace_member(workspace_id));

create policy "members can view fields"
on collection_fields for select
using (public.is_workspace_member(workspace_id));

create policy "members can view records"
on collection_records for select
using (public.is_workspace_member(workspace_id));

create policy "members can view values"
on record_values for select
using (public.is_workspace_member(workspace_id));

create policy "members can view views"
on views for select
using (public.is_workspace_member(workspace_id));

create policy "members can view pages"
on pages for select
using (public.is_workspace_member(workspace_id));

create policy "members can view widgets"
on widgets for select
using (public.is_workspace_member(workspace_id));

create policy "members can view ai builder previews"
on ai_builder_previews for select
using (public.is_workspace_member(workspace_id));

create policy "members can create their ai builder previews"
on ai_builder_previews for insert
with check (
  public.is_workspace_member(workspace_id)
  and created_by = auth.uid()
);

create policy "members can view templates"
on templates for select
using (workspace_id is null or public.is_workspace_member(workspace_id));

-- NOTE: insert/update/delete should be added after role_capabilities are implemented.
-- For MVP backend API routes can use service role safely server-side after validating user permissions.
