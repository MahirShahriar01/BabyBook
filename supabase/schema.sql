-- =====================================================================
-- Kids Explorer AI — Supabase schema (run in Supabase SQL editor once)
-- Content is stored as JSONB documents so the Admin Panel, web app and
-- Flutter app share one format (see shared/content/*.json).
-- =====================================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------ admins
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'editor' check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin(min_role text default 'editor')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins a
    where a.user_id = auth.uid()
      and (min_role = 'viewer'
        or (min_role = 'editor' and a.role in ('owner', 'editor'))
        or (min_role = 'owner' and a.role = 'owner'))
  );
$$;

-- ------------------------------------------------------------ settings
-- rows: 'global' (settings.json) and 'buddy' (buddy.json knowledge base)
create table if not exists public.app_settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------ content tables
do $$
declare t text;
begin
  foreach t in array array['stories', 'videos', 'topics', 'quiz'] loop
    execute format($f$
      create table if not exists public.%I (
        id text primary key,
        data jsonb not null,
        published boolean not null default true,
        sort integer not null default 0,
        updated_at timestamptz not null default now()
      )$f$, t);
  end loop;
end $$;

create table if not exists public.languages (
  id text primary key,            -- language code, e.g. 'en', 'bn'
  data jsonb not null,
  enabled boolean not null default true,
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------ analytics (anonymous)
create table if not exists public.events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  event text not null check (char_length(event) <= 60),
  item_id text check (char_length(item_id) <= 80),
  item_name text check (char_length(item_name) <= 120),
  value numeric,
  lang text check (char_length(lang) <= 10),
  platform text check (platform in ('web', 'android', 'ios')),
  session_id text check (char_length(session_id) <= 40),
  age_group text check (char_length(age_group) <= 10),
  gender text check (char_length(gender) <= 10),
  theme text check (char_length(theme) <= 30)
);
create index if not exists events_created_idx on public.events (created_at desc);
create index if not exists events_event_idx on public.events (event, created_at desc);

-- ------------------------------------------------------------ updated_at trigger
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['app_settings', 'stories', 'videos', 'topics', 'quiz', 'languages'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$I', t);
    execute format('create trigger touch_%1$s before update on public.%1$I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ------------------------------------------------------------ row level security
alter table public.admins enable row level security;
alter table public.app_settings enable row level security;
alter table public.stories enable row level security;
alter table public.videos enable row level security;
alter table public.topics enable row level security;
alter table public.quiz enable row level security;
alter table public.languages enable row level security;
alter table public.events enable row level security;

-- admins table: admins can see the team, only owners manage it
drop policy if exists admins_read on public.admins;
create policy admins_read on public.admins for select using (public.is_admin('viewer'));
drop policy if exists admins_write on public.admins;
create policy admins_write on public.admins for all using (public.is_admin('owner')) with check (public.is_admin('owner'));

-- settings: everyone may read (apps need them), editors write
drop policy if exists settings_read on public.app_settings;
create policy settings_read on public.app_settings for select using (true);
drop policy if exists settings_write on public.app_settings;
create policy settings_write on public.app_settings for all using (public.is_admin()) with check (public.is_admin());

-- content: public sees published rows, admins see and edit everything
do $$
declare t text;
begin
  foreach t in array array['stories', 'videos', 'topics', 'quiz'] loop
    execute format('drop policy if exists %1$s_read on public.%1$I', t);
    execute format('create policy %1$s_read on public.%1$I for select using (published or public.is_admin(''viewer''))', t);
    execute format('drop policy if exists %1$s_write on public.%1$I', t);
    execute format('create policy %1$s_write on public.%1$I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;
drop policy if exists languages_read on public.languages;
create policy languages_read on public.languages for select using (enabled or public.is_admin('viewer'));
drop policy if exists languages_write on public.languages;
create policy languages_write on public.languages for all using (public.is_admin()) with check (public.is_admin());

-- events: apps can only INSERT (no reads with the public key); admins read
drop policy if exists events_insert on public.events;
create policy events_insert on public.events for insert with check (true);
drop policy if exists events_read on public.events;
create policy events_read on public.events for select using (public.is_admin('viewer'));
drop policy if exists events_delete on public.events;
create policy events_delete on public.events for delete using (public.is_admin('owner'));

-- ------------------------------------------------------------ reporting views (admin only via RLS on events)
create or replace view public.report_daily with (security_invoker = true) as
  select date_trunc('day', created_at)::date as day,
         count(*) as events,
         count(distinct session_id) as sessions,
         count(distinct session_id) filter (where platform = 'web') as web_sessions,
         count(distinct session_id) filter (where platform = 'android') as android_sessions
  from public.events
  where created_at > now() - interval '90 days'
  group by 1 order by 1;

create or replace view public.report_top_items with (security_invoker = true) as
  select event, item_id, max(item_name) as item_name, count(*) as total
  from public.events
  where created_at > now() - interval '30 days' and item_id is not null
  group by event, item_id
  order by total desc;

-- ------------------------------------------------------------ media storage
insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists media_read on storage.objects;
create policy media_read on storage.objects for select using (bucket_id = 'media');
drop policy if exists media_write on storage.objects;
create policy media_write on storage.objects for insert with check (bucket_id = 'media' and public.is_admin());
drop policy if exists media_update on storage.objects;
create policy media_update on storage.objects for update using (bucket_id = 'media' and public.is_admin());
drop policy if exists media_delete on storage.objects;
create policy media_delete on storage.objects for delete using (bucket_id = 'media' and public.is_admin());

-- ------------------------------------------------------------ first admin
-- After creating your user in Authentication > Users, run:
--   insert into public.admins (user_id, email, role)
--   select id, email, 'owner' from auth.users where email = 'you@example.com';
