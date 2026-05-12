-- Classification records anchored on Solana
create table if not exists public.cr_records (
  id              uuid primary key default gen_random_uuid(),
  record_id       text not null,
  cr_version      text not null default 'v1',
  cr_json         jsonb not null,
  cr_hash         text not null,
  signature       text not null unique,
  wallet          text not null,
  network         text not null default 'devnet',
  anchored_at     timestamptz not null default now()
);

create index if not exists cr_records_record_id_idx on public.cr_records (record_id);
create index if not exists cr_records_anchored_at_idx on public.cr_records (anchored_at desc);

alter table public.cr_records enable row level security;

-- Public read so the /verify/:signature page works for anyone
create policy "cr_records public read"
  on public.cr_records for select
  using (true);

-- Authenticated users can insert their own anchors
create policy "cr_records insert authenticated"
  on public.cr_records for insert
  to authenticated
  with check (true);


-- Build attestations (file hash + milestone)
create table if not exists public.build_attestations (
  id              uuid primary key default gen_random_uuid(),
  milestone       text not null,
  file_hash       text not null,
  signature       text not null unique,
  wallet          text not null,
  network         text not null default 'devnet',
  anchored_at     timestamptz not null default now()
);

create index if not exists build_attestations_milestone_idx on public.build_attestations (milestone);
create index if not exists build_attestations_anchored_at_idx on public.build_attestations (anchored_at desc);

alter table public.build_attestations enable row level security;

create policy "build_attestations public read"
  on public.build_attestations for select
  using (true);

create policy "build_attestations insert authenticated"
  on public.build_attestations for insert
  to authenticated
  with check (true);
