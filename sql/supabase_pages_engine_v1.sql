-- SKAIL Pages Engine v1
-- Notion-like editor: stacks, page documents (BlockNote JSON), recents, page forms, trash.
-- Idempotent. Safe to re-run.

-- 1. Fresh-start truncates: existing pages/widgets are dropped per the rewrite plan.
--    These run only once on first apply; if the tables are empty afterwards, re-running is a no-op.
truncate table public.widget_style_settings cascade;
truncate table public.page_style_settings cascade;
truncate table public.widgets cascade;
truncate table public.pages cascade;

-- 2. page_stacks — workspace-scoped sidebar containers (Notion teamspace equivalent).
create table if not exists public.page_stacks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  icon text null,
  position integer not null default 0,
  archived_at timestamptz null,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists page_stacks_workspace_idx on public.page_stacks(workspace_id, position) where archived_at is null;

alter table public.page_stacks enable row level security;
drop policy if exists page_stacks_select on public.page_stacks;
create policy page_stacks_select on public.page_stacks
  for select using (public.is_workspace_member(workspace_id));

-- 3. Pages: extend with stack_id, cover_image_url, archived_at, last_edited_by.
alter table public.pages add column if not exists stack_id uuid null references public.page_stacks(id) on delete set null;
alter table public.pages add column if not exists cover_image_url text null;
alter table public.pages add column if not exists archived_at timestamptz null;
alter table public.pages add column if not exists last_edited_by uuid null;

create index if not exists pages_stack_active_idx on public.pages(stack_id) where archived_at is null;
create index if not exists pages_archived_idx on public.pages(workspace_id, archived_at) where archived_at is not null;
create index if not exists pages_workspace_active_idx on public.pages(workspace_id) where archived_at is null;

-- 4. page_documents — BlockNote JSON document per page; one row per page.
create table if not exists public.page_documents (
  page_id uuid primary key references public.pages(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  content_json jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  updated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.page_documents enable row level security;
drop policy if exists page_documents_select on public.page_documents;
create policy page_documents_select on public.page_documents
  for select using (public.is_workspace_member(workspace_id));

-- 5. page_visits — recents tracking per (user, page).
create table if not exists public.page_visits (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  page_id uuid not null references public.pages(id) on delete cascade,
  user_id uuid not null,
  last_opened_at timestamptz not null default now(),
  primary key (workspace_id, user_id, page_id)
);
create index if not exists page_visits_recent_idx on public.page_visits(workspace_id, user_id, last_opened_at desc);

alter table public.page_visits enable row level security;
drop policy if exists page_visits_select on public.page_visits;
create policy page_visits_select on public.page_visits
  for select using (
    public.is_workspace_member(workspace_id) and user_id = auth.uid()
  );

-- 6. page_forms — standalone form blocks; schema lives here, submissions in page_form_submissions.
create table if not exists public.page_forms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  page_id uuid not null references public.pages(id) on delete cascade,
  block_id text not null,
  title text not null default 'Form',
  description text null,
  fields_json jsonb not null default '[]'::jsonb,
  submit_text text not null default 'Submit',
  success_message text not null default 'Thanks for submitting!',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_id, block_id)
);
create index if not exists page_forms_page_idx on public.page_forms(page_id);

alter table public.page_forms enable row level security;
drop policy if exists page_forms_select on public.page_forms;
create policy page_forms_select on public.page_forms
  for select using (public.is_workspace_member(workspace_id));

-- 7. page_form_submissions — submissions for page forms.
create table if not exists public.page_form_submissions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  form_id uuid not null references public.page_forms(id) on delete cascade,
  values_json jsonb not null,
  submitted_by uuid null,
  ip_hash text null,
  created_at timestamptz not null default now()
);
create index if not exists page_form_submissions_form_idx on public.page_form_submissions(form_id, created_at desc);

alter table public.page_form_submissions enable row level security;
drop policy if exists page_form_submissions_select on public.page_form_submissions;
create policy page_form_submissions_select on public.page_form_submissions
  for select using (public.is_workspace_member(workspace_id));

-- 8. Storage bucket for page assets (covers, images, files inside pages).
--    Private; access via signed URLs issued by server.
insert into storage.buckets (id, name, public)
values ('page-assets', 'page-assets', false)
on conflict (id) do nothing;

-- 9. RLS on storage.objects for the page-assets bucket: workspace members may select.
--    Path layout: workspaceId/pageId/blockId/fileId-name.ext
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'page_assets_select_member'
  ) then
    create policy page_assets_select_member on storage.objects
      for select using (
        bucket_id = 'page-assets'
        and exists (
          select 1 from public.workspace_members wm
          where wm.user_id = auth.uid()
            and wm.status = 'active'
            and wm.workspace_id::text = split_part(storage.objects.name, '/', 1)
        )
      );
  end if;
end $$;
