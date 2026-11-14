-- Builder drafts are separate from the existing commission schema.
-- Each row is owned by the authenticated artist and starts from the live site.
create table if not exists public.builder_drafts (
  id uuid primary key default gen_random_uuid(),
  draft_number integer not null,
  name text not null default 'Untitled draft',
  source_page text not null default 'index.html',
  base_revision text not null default 'live',
  status text not null default 'draft' check (status in ('draft', 'requested', 'merged', 'archived')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (created_by, draft_number)
);

create table if not exists public.builder_draft_operations (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.builder_drafts(id) on delete cascade,
  operation_order integer not null,
  file_path text not null,
  selector text not null,
  operation_type text not null default 'set',
  value jsonb not null,
  previous_value jsonb,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (draft_id, operation_order)
);

create index if not exists builder_drafts_created_by_idx on public.builder_drafts(created_by, updated_at desc);
create index if not exists builder_draft_operations_draft_idx on public.builder_draft_operations(draft_id, operation_order);

create or replace function public.builder_drafts_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists builder_drafts_updated_at on public.builder_drafts;
create trigger builder_drafts_updated_at
before update on public.builder_drafts
for each row execute function public.builder_drafts_set_updated_at();

alter table public.builder_drafts enable row level security;
alter table public.builder_draft_operations enable row level security;

drop policy if exists "Users can view their builder drafts" on public.builder_drafts;
create policy "Users can view their builder drafts"
on public.builder_drafts for select to authenticated
using (created_by = auth.uid());

drop policy if exists "Users can create their builder drafts" on public.builder_drafts;
create policy "Users can create their builder drafts"
on public.builder_drafts for insert to authenticated
with check (created_by = auth.uid());

drop policy if exists "Users can update their builder drafts" on public.builder_drafts;
create policy "Users can update their builder drafts"
on public.builder_drafts for update to authenticated
using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists "Users can delete their builder drafts" on public.builder_drafts;
create policy "Users can delete their builder drafts"
on public.builder_drafts for delete to authenticated
using (created_by = auth.uid());

drop policy if exists "Users can view their builder operations" on public.builder_draft_operations;
create policy "Users can view their builder operations"
on public.builder_draft_operations for select to authenticated
using (created_by = auth.uid());

drop policy if exists "Users can create their builder operations" on public.builder_draft_operations;
create policy "Users can create their builder operations"
on public.builder_draft_operations for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (select 1 from public.builder_drafts d where d.id = draft_id and d.created_by = auth.uid())
);

drop policy if exists "Users can delete their builder operations" on public.builder_draft_operations;
create policy "Users can delete their builder operations"
on public.builder_draft_operations for delete to authenticated
using (created_by = auth.uid());

grant select, insert, update, delete on public.builder_drafts to authenticated;
grant select, insert, delete on public.builder_draft_operations to authenticated;
