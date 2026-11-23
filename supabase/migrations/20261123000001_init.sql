-- LaunchPage.link 2.0 — core schema with Row-Level Security
-- Run in Supabase SQL editor (or `supabase db push`). Safe to run on a fresh project.

create extension if not exists pgcrypto;

-- ---------- profiles & roles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'member' check (role in ('member','client','operator','admin')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, split_part(new.email,'@',1))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_operator() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('operator','admin'));
$$;

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create policy "own profile read" on public.profiles for select using (id = auth.uid() or public.is_operator());
create policy "own profile name" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = public.my_role()); -- cannot self-promote
create policy "admins manage roles" on public.profiles for update using (public.my_role() = 'admin');

-- ---------- public launches ----------
create table if not exists public.launches (
  id text primary key,
  name text not null,
  category text,
  status text,
  tone text,
  tagline text,
  site text,
  interest integer not null default 0,
  roles text[] not null default '{}',
  milestones jsonb not null default '[]',      -- only approved + published milestones are written here
  image text, video text,
  screenshots jsonb not null default '[]',
  launch_url text,
  target_date date,
  visibility text not null default 'discoverable' check (visibility in ('private','page','discoverable')),
  updated_at timestamptz not null default now()
);
alter table public.launches enable row level security;
create policy "public reads non-private launches" on public.launches for select using (visibility <> 'private' or public.is_operator());
create policy "operators write launches" on public.launches for all using (public.is_operator()) with check (public.is_operator());

-- ---------- public progress updates ----------
create table if not exists public.launch_updates (
  id text primary key,
  launch_id text not null references public.launches(id) on delete cascade,
  type text not null default 'update' check (type in ('update','milestone','feature','screenshot','video','launch-date','beta','testing')),
  title text not null,
  body text,
  media_url text,
  state text not null default 'draft' check (state in ('draft','scheduled','published')),
  publish_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.launch_updates enable row level security;
create policy "public reads live updates" on public.launch_updates for select using (
  public.is_operator() or (
    (state = 'published' or (state = 'scheduled' and publish_at <= now()))
    and exists (select 1 from public.launches l where l.id = launch_id and l.visibility <> 'private')
  ));
create policy "operators write updates" on public.launch_updates for all using (public.is_operator()) with check (public.is_operator());

-- ---------- submissions: waitlist / I Can Help / Founders Club ----------
create table if not exists public.launch_signups (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('waitlist','help','founders')),
  launch_id text references public.launches(id) on delete set null,
  launches text[] not null default '{}',
  name text not null check (char_length(name) between 1 and 80),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' and char_length(email) <= 120),
  phone text check (phone is null or char_length(phone) <= 30),
  role text, roles text[] not null default '{}',
  note text check (note is null or char_length(note) <= 1000),
  consent boolean not null,
  consent_at timestamptz,
  status text not null default 'new' check (status in ('new','contacted','accepted','declined')),
  created_at timestamptz not null default now()
);
alter table public.launch_signups enable row level security;
-- Anyone may submit (with consent). Nobody but operators can read them back.
create policy "anyone submits with consent" on public.launch_signups for insert to anon, authenticated
  with check (consent = true and status = 'new');
create policy "operators read signups" on public.launch_signups for select using (public.is_operator());
create policy "operators update signups" on public.launch_signups for update using (public.is_operator());
create policy "operators delete signups" on public.launch_signups for delete using (public.is_operator());
create unique index if not exists launch_signups_dedupe on public.launch_signups (lower(email), kind, coalesce(launch_id,''));

-- Public interest counts without exposing any submission rows
create or replace function public.public_interest() returns table (launch_id text, n bigint)
language sql stable security definer set search_path = public as $$
  select x.lid, count(*) from (
    select launch_id as lid from public.launch_signups where launch_id is not null
    union all select unnest(launches) from public.launch_signups
  ) x join public.launches l on l.id = x.lid and l.visibility <> 'private'
  group by x.lid;
$$;
grant execute on function public.public_interest() to anon, authenticated;

-- ---------- private Studio documents (projects, clients, audits, overrides…) ----------
create table if not exists public.studio_docs (
  collection text not null check (collection in ('projects','clients','audits','updates','overrides','custom')),
  id text not null,
  data jsonb not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);
alter table public.studio_docs enable row level security;
create policy "operators only" on public.studio_docs for all using (public.is_operator()) with check (public.is_operator());

-- ---------- limited client access to approved previews ----------
create table if not exists public.client_previews (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  client_email text not null,
  title text not null,
  preview_url text not null,
  approved_for_client boolean not null default false,
  client_decision text check (client_decision in ('approved','changes-requested')),
  client_comment text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.client_previews enable row level security;
create policy "operators manage previews" on public.client_previews for all using (public.is_operator()) with check (public.is_operator());
create policy "client sees own approved previews" on public.client_previews for select
  using (approved_for_client and lower(client_email) = lower(auth.jwt() ->> 'email'));
create policy "client records decision" on public.client_previews for update
  using (approved_for_client and lower(client_email) = lower(auth.jwt() ->> 'email'))
  with check (approved_for_client and lower(client_email) = lower(auth.jwt() ->> 'email'));

-- ---------- audit job queue (for a hosted worker) ----------
create table if not exists public.audit_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  url text not null check (url ~* '^https?://'),
  status text not null default 'queued' check (status in ('queued','running','done','failed')),
  attempts int not null default 0,
  error text,
  report jsonb,
  requested_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
alter table public.audit_jobs enable row level security;
create policy "operators manage audit jobs" on public.audit_jobs for all using (public.is_operator()) with check (public.is_operator());
-- The worker connects with the service_role key (server-side only), which bypasses RLS.

-- ---------- storage ----------
insert into storage.buckets (id, name, public) values ('public-media','public-media', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('private','private', false) on conflict do nothing;
create policy "public media read" on storage.objects for select using (bucket_id = 'public-media');
create policy "operators upload public media" on storage.objects for insert with check (bucket_id = 'public-media' and public.is_operator());
create policy "operators manage private files" on storage.objects for all using (bucket_id = 'private' and public.is_operator()) with check (bucket_id = 'private' and public.is_operator());

-- updated_at helper
create or replace function public.touch() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists launches_touch on public.launches;
create trigger launches_touch before update on public.launches for each row execute function public.touch();
drop trigger if exists studio_docs_touch on public.studio_docs;
create trigger studio_docs_touch before update on public.studio_docs for each row execute function public.touch();
