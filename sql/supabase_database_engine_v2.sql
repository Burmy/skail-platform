-- SKAIL Database Engine v2
-- Production rebuild of the databases surface: archive, advanced views, relations, files, formulas, public forms.
-- Additive and idempotent. Apply on top of supabase_schema_v1.sql + supabase_rls_v1.sql.

-- prerequisites
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

------------------------------------------------------------------------
-- Phase 1: archive columns + partial indexes
------------------------------------------------------------------------

alter table public.collections          add column if not exists archived_at timestamptz null;
alter table public.collection_fields    add column if not exists archived_at timestamptz null;
alter table public.collection_records   add column if not exists archived_at timestamptz null;
alter table public.views                add column if not exists archived_at timestamptz null;

create index if not exists collections_active_idx
  on public.collections(workspace_id) where archived_at is null;
create index if not exists collection_fields_active_idx
  on public.collection_fields(collection_id) where archived_at is null;
create index if not exists collection_records_active_idx
  on public.collection_records(collection_id) where archived_at is null;
create index if not exists views_active_idx
  on public.views(collection_id) where archived_at is null;

------------------------------------------------------------------------
-- Phase 1: trigram search index for ILIKE on record values JSONB
------------------------------------------------------------------------

create index if not exists record_values_text_search_idx
  on public.record_values using gin ((value_json::text) gin_trgm_ops);

------------------------------------------------------------------------
-- Phase 3: relations
------------------------------------------------------------------------

create table if not exists public.collection_relations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_field_id uuid not null references public.collection_fields(id) on delete cascade,
  target_field_id uuid null references public.collection_fields(id) on delete cascade,
  is_two_way boolean not null default true,
  is_self_ref boolean not null default false,
  created_at timestamptz not null default now(),
  unique(source_field_id)
);

create table if not exists public.collection_record_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  relation_id uuid not null references public.collection_relations(id) on delete cascade,
  source_record_id uuid not null references public.collection_records(id) on delete cascade,
  target_record_id uuid not null references public.collection_records(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(relation_id, source_record_id, target_record_id)
);
create index if not exists record_links_source_idx on public.collection_record_links(source_record_id);
create index if not exists record_links_target_idx on public.collection_record_links(target_record_id);

------------------------------------------------------------------------
-- Phase 3: file metadata (binaries live in Supabase Storage bucket 'collection-files')
------------------------------------------------------------------------

create table if not exists public.collection_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  record_id uuid not null references public.collection_records(id) on delete cascade,
  field_id uuid not null references public.collection_fields(id) on delete cascade,
  source text not null check (source in ('upload','external_link')),
  storage_path text null,
  external_url text null,
  filename text not null,
  mime_type text null,
  size_bytes bigint null,
  created_by uuid null,
  created_at timestamptz not null default now(),
  check ((source = 'upload' and storage_path is not null) or (source = 'external_link' and external_url is not null))
);
create index if not exists collection_files_record_field_idx on public.collection_files(record_id, field_id);

------------------------------------------------------------------------
-- Phase 3: formula AST stored on the field itself
------------------------------------------------------------------------

alter table public.collection_fields add column if not exists formula_json jsonb null;

------------------------------------------------------------------------
-- Phase 2: public form submissions
------------------------------------------------------------------------

-- partial unique index: only public form views with sharePublicly=true and a slug must be unique
create unique index if not exists views_public_form_slug_uidx
  on public.views ((config_json->'form'->>'publicSlug'))
  where (config_json->'form'->>'sharePublicly')::boolean is true
    and view_type = 'form'
    and archived_at is null;

create table if not exists public.form_submission_throttle (
  id uuid primary key default gen_random_uuid(),
  view_id uuid not null references public.views(id) on delete cascade,
  ip_hash text not null,
  submitted_at timestamptz not null default now()
);
create index if not exists form_throttle_view_ip_time_idx
  on public.form_submission_throttle(view_id, ip_hash, submitted_at desc);

------------------------------------------------------------------------
-- RLS for new tables
------------------------------------------------------------------------

alter table public.collection_relations    enable row level security;
alter table public.collection_record_links enable row level security;
alter table public.collection_files        enable row level security;
alter table public.form_submission_throttle enable row level security;

drop policy if exists "members can view collection relations"    on public.collection_relations;
drop policy if exists "members can view collection record links" on public.collection_record_links;
drop policy if exists "members can view collection files"        on public.collection_files;

create policy "members can view collection relations"
  on public.collection_relations for select
  using (public.is_workspace_member(workspace_id));

create policy "members can view collection record links"
  on public.collection_record_links for select
  using (public.is_workspace_member(workspace_id));

create policy "members can view collection files"
  on public.collection_files for select
  using (public.is_workspace_member(workspace_id));

-- form_submission_throttle is service-role only; no public policies.
