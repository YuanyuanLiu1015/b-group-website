-- Run once in Supabase SQL editor. Edge Function accesses via a secret key.
create table if not exists public.bgroup_events (
  event_id uuid primary key,
  rid text not null check (char_length(rid) between 6 and 100),
  visit_id uuid not null,
  event_type text not null,
  info text,
  event_at timestamptz,
  duration_seconds integer,
  bottom boolean,
  max_scroll numeric,
  received_at timestamptz not null default now()
);
create index if not exists bgroup_events_visit on public.bgroup_events(rid, visit_id, received_at);

create table if not exists public.bgroup_sessions (
  rid text not null,
  visit_id uuid not null,
  info1_clicked boolean not null default false,
  info2_clicked boolean not null default false,
  info1_viewed boolean not null default false,
  info2_viewed boolean not null default false,
  info1_duration integer not null default 0,
  info2_duration integer not null default 0,
  info1_bottom boolean not null default false,
  info2_bottom boolean not null default false,
  group_type text not null check (group_type in ('B1','B2','B3','B4')),
  min_view_seconds integer not null,
  require_bottom_scroll boolean not null,
  finalized_at timestamptz not null default now(),
  primary key(rid, visit_id)
);
create index if not exists bgroup_sessions_group on public.bgroup_sessions(group_type);

alter table public.bgroup_events enable row level security;
alter table public.bgroup_sessions enable row level security;
-- No SELECT/INSERT/UPDATE/DELETE policies for anon/authenticated.
revoke all on public.bgroup_events from anon, authenticated;
revoke all on public.bgroup_sessions from anon, authenticated;
-- Service-role key is accessible ONLY inside the Edge Function.
