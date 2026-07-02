create table if not exists public.workspace_members (
  id bigint generated always as identity primary key,
  workspace_id text not null,
  email text not null,
  display_name text not null default '',
  role text not null default 'editor',
  created_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, email),
  check (role in ('owner', 'editor', 'viewer'))
);

create table if not exists public.workspace_state (
  workspace_id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by text not null default ''
);

create table if not exists public.session_shares (
  id bigint generated always as identity primary key,
  workspace_id text not null,
  session_id text not null,
  session_name text not null,
  share_token text not null unique,
  share_snapshot jsonb not null,
  expires_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.workspace_members enable row level security;
alter table public.workspace_state enable row level security;
alter table public.session_shares enable row level security;

create or replace function public.is_workspace_member(target_workspace_id text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and lower(wm.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

drop policy if exists "members can read own membership" on public.workspace_members;
create policy "members can read own membership"
on public.workspace_members
for select
to authenticated
using (
  lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "members can read workspace state" on public.workspace_state;
create policy "members can read workspace state"
on public.workspace_state
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can insert workspace state" on public.workspace_state;
create policy "members can insert workspace state"
on public.workspace_state
for insert
to authenticated
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can update workspace state" on public.workspace_state;
create policy "members can update workspace state"
on public.workspace_state
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can read session shares" on public.session_shares;
create policy "members can read session shares"
on public.session_shares
for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "members can insert session shares" on public.session_shares;
create policy "members can insert session shares"
on public.session_shares
for insert
to authenticated
with check (public.is_workspace_member(workspace_id));

drop policy if exists "members can update session shares" on public.session_shares;
create policy "members can update session shares"
on public.session_shares
for update
to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

create or replace function public.get_shared_session(p_share_token text)
returns table (
  session_name text,
  share_snapshot jsonb,
  expires_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    ss.session_name,
    ss.share_snapshot,
    ss.expires_at
  from public.session_shares ss
  where ss.share_token = p_share_token
    and (ss.expires_at is null or ss.expires_at > timezone('utc', now()))
  limit 1;
$$;

revoke all on function public.get_shared_session(text) from public;
grant execute on function public.get_shared_session(text) to anon, authenticated;

alter publication supabase_realtime add table public.workspace_state;
