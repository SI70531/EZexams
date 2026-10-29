-- EZexams accounts: run this once in Supabase → SQL Editor → New query → Run.
-- It is safe to run again (nothing is dropped, policies are replaced).
--
-- One row = one account's progress for one subject. `payload` is the same {updatedAt, data} object the site has
-- always synced. Row Level Security means a signed-in person can only ever read or write their own rows,
-- whatever the website code does.

create table if not exists public.progress (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  key        text        not null check (key ~ '^[a-z0-9-]{1,40}$'),
  payload    jsonb       not null check (pg_column_size(payload) < 400000),
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.progress enable row level security;

drop policy if exists "progress: read own"   on public.progress;
drop policy if exists "progress: insert own" on public.progress;
drop policy if exists "progress: update own" on public.progress;

create policy "progress: read own"   on public.progress for select to authenticated using      ((select auth.uid()) = user_id);
create policy "progress: insert own" on public.progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "progress: update own" on public.progress for update to authenticated using      ((select auth.uid()) = user_id)
                                                                                    with check ((select auth.uid()) = user_id);

-- "Automatically expose new tables" is off, so the table is opened explicitly, to signed-in people only.
revoke all on public.progress from anon, authenticated;
grant select, insert, update on public.progress to authenticated;

-- A single account may hold at most 20 subjects/keys (the site uses 4), so nobody can fill the database.
create or replace function public.progress_limit() returns trigger language plpgsql as $$
begin
  if (select count(*) from public.progress where user_id = new.user_id) >= 20 then
    raise exception 'too many progress rows for this account';
  end if;
  return new;
end $$;

drop trigger if exists progress_limit on public.progress;
create trigger progress_limit before insert on public.progress for each row execute function public.progress_limit();
