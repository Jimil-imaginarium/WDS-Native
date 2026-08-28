-- ═══════════════════════════════════════════════════════════════════
--  The Treasure Hunt ❤️ — complete database schema
--  Run this once in the Supabase SQL editor (or `supabase db push`).
--  It creates every table, index, trigger, RLS policy, storage bucket
--  and realtime publication the app needs.
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 0. Extensions
-- ─────────────────────────────────────────────
create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────
-- 1. Tables
-- ─────────────────────────────────────────────

-- 1.1 profiles — one row per auth user, carries the role
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'player' check (role in ('admin', 'player')),
  display_name text not null default 'My Love',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 1.2 days — an island on the treasure map
create table if not exists public.days (
  id          uuid primary key default gen_random_uuid(),
  day_number  int  not null unique check (day_number >= 1),
  title       text not null,
  story       text not null default '',
  island_name text not null default 'Mystery Island',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 1.3 riddles — three per day
create table if not exists public.riddles (
  id            uuid primary key default gen_random_uuid(),
  day_id        uuid not null references public.days (id) on delete cascade,
  riddle_number int  not null check (riddle_number between 1 and 3),
  title         text not null,
  story         text not null default '',
  question      text not null,
  image_url     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (day_id, riddle_number)
);

-- 1.4 unlock_schedule — when each riddle becomes visible
create table if not exists public.unlock_schedule (
  id         uuid primary key default gen_random_uuid(),
  riddle_id  uuid not null unique references public.riddles (id) on delete cascade,
  unlock_at  timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.5 punishments — one per riddle
create table if not exists public.punishments (
  id          uuid primary key default gen_random_uuid(),
  riddle_id   uuid not null unique references public.riddles (id) on delete cascade,
  title       text not null,
  description text not null default '',
  proof_types text[] not null default array['photo','video','text','audio'],
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 1.6 answers — every attempt the player makes
create table if not exists public.answers (
  id           uuid primary key default gen_random_uuid(),
  riddle_id    uuid not null references public.riddles (id) on delete cascade,
  player_id    uuid not null references public.profiles (id) on delete cascade,
  answer_text  text not null,
  status       text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at  timestamptz,
  reviewed_by  uuid references public.profiles (id)
);

-- 1.7 punishment_submissions — proof uploads after a rejected answer
create table if not exists public.punishment_submissions (
  id            uuid primary key default gen_random_uuid(),
  punishment_id uuid not null references public.punishments (id) on delete cascade,
  answer_id     uuid not null references public.answers (id) on delete cascade,
  player_id     uuid not null references public.profiles (id) on delete cascade,
  proof_type    text not null check (proof_type in ('photo','video','text','audio')),
  proof_url     text,
  proof_text    text,
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at  timestamptz not null default now(),
  reviewed_at   timestamptz,
  reviewed_by   uuid references public.profiles (id)
);

-- 1.8 game_progress — one row per player per riddle, maintained by triggers
create table if not exists public.game_progress (
  id                 uuid primary key default gen_random_uuid(),
  player_id          uuid not null references public.profiles (id) on delete cascade,
  riddle_id          uuid not null references public.riddles (id) on delete cascade,
  status             text not null default 'in_progress' check (status in ('in_progress','completed')),
  attempts           int  not null default 0,
  punishments_served int  not null default 0,
  started_at         timestamptz not null default now(),
  completed_at       timestamptz,
  unique (player_id, riddle_id)
);

-- 1.9 notifications
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text not null default '',
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- 1.10 game_settings — singleton row, non-secret settings
create table if not exists public.game_settings (
  id              int primary key default 1 check (id = 1),
  game_title      text not null default 'The Treasure Hunt ❤️',
  welcome_message text not null default 'A little adventure, made just for you.',
  music_url       text,
  updated_at      timestamptz not null default now()
);

-- 1.11 finale — singleton row, SECRET until the hunt is complete.
--      Players can only reach it through the get_finale() function below.
create table if not exists public.finale (
  id                 int primary key default 1 check (id = 1),
  treasure_title     text not null default 'The Final Treasure',
  treasure_message   text not null default '',
  love_letter        text not null default '',
  treasure_image_url text,
  music_url          text,
  updated_at         timestamptz not null default now()
);

insert into public.game_settings (id) values (1) on conflict (id) do nothing;
insert into public.finale (id) values (1) on conflict (id) do nothing;

-- ─────────────────────────────────────────────
-- 2. Indexes
-- ─────────────────────────────────────────────
create index if not exists idx_riddles_day_id             on public.riddles (day_id);
create index if not exists idx_unlock_schedule_riddle     on public.unlock_schedule (riddle_id);
create index if not exists idx_unlock_schedule_unlock_at  on public.unlock_schedule (unlock_at);
create index if not exists idx_punishments_riddle         on public.punishments (riddle_id);
create index if not exists idx_answers_riddle             on public.answers (riddle_id);
create index if not exists idx_answers_player             on public.answers (player_id);
create index if not exists idx_answers_status             on public.answers (status);
create index if not exists idx_psub_punishment            on public.punishment_submissions (punishment_id);
create index if not exists idx_psub_answer                on public.punishment_submissions (answer_id);
create index if not exists idx_psub_player                on public.punishment_submissions (player_id);
create index if not exists idx_psub_status                on public.punishment_submissions (status);
create index if not exists idx_progress_player            on public.game_progress (player_id);
create index if not exists idx_progress_riddle            on public.game_progress (riddle_id);
create index if not exists idx_notifications_user_created on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_user_unread  on public.notifications (user_id) where not read;

-- ─────────────────────────────────────────────
-- 3. Helper functions
-- ─────────────────────────────────────────────

-- Is the current user the admin?
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Server clock, used by clients to sync countdowns
create or replace function public.get_server_time()
returns timestamptz
language sql stable
as $$
  select now();
$$;

-- Is a riddle unlocked (its scheduled time has passed)?
create or replace function public.is_riddle_unlocked(r_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.unlock_schedule s
    where s.riddle_id = r_id and s.unlock_at <= now()
  );
$$;

-- Can the current player submit an answer for this riddle?
--   • the riddle must be unlocked
--   • no answer already approved
--   • no answer currently pending
--   • if the latest answer was rejected, its punishment must be approved
create or replace function public.can_submit_answer(r_id uuid)
returns boolean
language plpgsql stable security definer
set search_path = public
as $$
declare
  latest public.answers%rowtype;
begin
  if not public.is_riddle_unlocked(r_id) then
    return false;
  end if;

  select * into latest
  from public.answers
  where riddle_id = r_id and player_id = auth.uid()
  order by submitted_at desc
  limit 1;

  if latest.id is null then
    return true;                    -- first attempt
  end if;

  if latest.status = 'approved' then
    return false;                   -- already solved
  end if;

  if latest.status = 'pending' then
    return false;                   -- waiting for review
  end if;

  -- latest is rejected → punishment for that answer must be approved
  return exists (
    select 1 from public.punishment_submissions ps
    where ps.answer_id = latest.id and ps.status = 'approved'
  );
end;
$$;

-- Can the current player submit punishment proof for this answer?
--   • the answer must be theirs and rejected
--   • the punishment must belong to the answer's riddle
--   • no proof already pending or approved for it
create or replace function public.can_submit_proof(a_id uuid, p_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.answers a
    join public.punishments p on p.riddle_id = a.riddle_id
    where a.id = a_id
      and p.id = p_id
      and a.player_id = auth.uid()
      and a.status = 'rejected'
  )
  and not exists (
    select 1 from public.punishment_submissions ps
    where ps.answer_id = a_id
      and ps.status in ('pending', 'approved')
  );
$$;

-- Has the current player completed every riddle?
create or replace function public.is_hunt_complete()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select count(*) > 0
     and count(*) = count(*) filter (
       where exists (
         select 1 from public.answers a
         where a.riddle_id = r.id
           and a.player_id = auth.uid()
           and a.status = 'approved'
       )
     )
  from public.riddles r;
$$;

-- Map data for the player: safe fields only.
-- Locked riddles reveal nothing but their position and unlock time.
create or replace function public.get_map()
returns table (
  riddle_id     uuid,
  day_id        uuid,
  day_number    int,
  day_title     text,
  island_name   text,
  riddle_number int,
  riddle_title  text,
  unlock_at     timestamptz,
  unlocked      boolean,
  completed     boolean
)
language sql stable security definer
set search_path = public
as $$
  select
    r.id,
    d.id,
    d.day_number,
    d.title,
    d.island_name,
    r.riddle_number,
    case when s.unlock_at <= now() then r.title else null end,
    s.unlock_at,
    coalesce(s.unlock_at <= now(), false),
    exists (
      select 1 from public.answers a
      where a.riddle_id = r.id
        and a.player_id = auth.uid()
        and a.status = 'approved'
    )
  from public.riddles r
  join public.days d on d.id = r.day_id
  left join public.unlock_schedule s on s.riddle_id = r.id
  order by d.day_number, r.riddle_number;
$$;

-- The finale content — only revealed once every riddle is solved (or to admin).
create or replace function public.get_finale()
returns setof public.finale
language sql stable security definer
set search_path = public
as $$
  select * from public.finale
  where public.is_admin() or public.is_hunt_complete();
$$;

-- ─────────────────────────────────────────────
-- 4. Triggers
-- ─────────────────────────────────────────────

-- 4.1 keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','days','riddles','unlock_schedule','punishments','game_settings','finale']
  loop
    execute format('drop trigger if exists trg_touch_%s on public.%I', t, t);
    execute format(
      'create trigger trg_touch_%s before update on public.%I
       for each row execute function public.touch_updated_at()', t, t);
  end loop;
end;
$$;

-- 4.2 auto-create a profile when an auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    case
      when new.raw_user_meta_data ->> 'role' in ('admin', 'player')
        then new.raw_user_meta_data ->> 'role'
      else 'player'
    end,
    coalesce(new.raw_user_meta_data ->> 'display_name', 'My Love')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4.3 answer inserted → notify admin, bump game_progress attempts
create or replace function public.on_answer_inserted()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  r_title text;
begin
  select title into r_title from public.riddles where id = new.riddle_id;

  insert into public.game_progress (player_id, riddle_id, attempts)
  values (new.player_id, new.riddle_id, 1)
  on conflict (player_id, riddle_id)
  do update set attempts = public.game_progress.attempts + 1;

  insert into public.notifications (user_id, type, title, body, link)
  select p.id, 'answer_submitted', '💌 New answer submitted',
         format('An answer arrived for “%s”.', coalesce(r_title, 'a riddle')),
         '/admin'
  from public.profiles p where p.role = 'admin';

  return new;
end;
$$;

drop trigger if exists trg_answer_inserted on public.answers;
create trigger trg_answer_inserted
  after insert on public.answers
  for each row execute function public.on_answer_inserted();

-- 4.4 answer reviewed → notify player, update progress, detect hunt completion
create or replace function public.on_answer_reviewed()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  r_title      text;
  total        int;
  solved       int;
begin
  if new.status = old.status then
    return new;
  end if;

  select title into r_title from public.riddles where id = new.riddle_id;

  if new.status = 'approved' then
    update public.game_progress
      set status = 'completed', completed_at = now()
      where player_id = new.player_id and riddle_id = new.riddle_id;

    insert into public.notifications (user_id, type, title, body, link)
    values (new.player_id, 'answer_approved', '✨ Correct!',
            format('Your answer to “%s” was right. The map grows…', coalesce(r_title, 'the riddle')),
            '/hunt');

    select count(*) into total from public.riddles;
    select count(distinct a.riddle_id) into solved
      from public.answers a
      where a.player_id = new.player_id and a.status = 'approved';

    if total > 0 and solved >= total then
      insert into public.notifications (user_id, type, title, body, link)
      values (new.player_id, 'hunt_complete', '🏆 The treasure is yours!',
              'Every riddle is solved. Something is waiting for you…',
              '/finale');
    end if;

  elsif new.status = 'rejected' then
    insert into public.notifications (user_id, type, title, body, link)
    values (new.player_id, 'answer_rejected', '❌ Wrong answer',
            format('Not quite… complete your punishment for “%s” to try again!', coalesce(r_title, 'the riddle')),
            '/hunt');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_answer_reviewed on public.answers;
create trigger trg_answer_reviewed
  after update of status on public.answers
  for each row execute function public.on_answer_reviewed();

-- 4.5 proof uploaded → notify admin
create or replace function public.on_proof_inserted()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  p_title text;
begin
  select title into p_title from public.punishments where id = new.punishment_id;

  insert into public.notifications (user_id, type, title, body, link)
  select p.id, 'proof_submitted', '🎭 Punishment proof uploaded',
         format('Proof arrived for “%s”.', coalesce(p_title, 'a punishment')),
         '/admin'
  from public.profiles p where p.role = 'admin';

  return new;
end;
$$;

drop trigger if exists trg_proof_inserted on public.punishment_submissions;
create trigger trg_proof_inserted
  after insert on public.punishment_submissions
  for each row execute function public.on_proof_inserted();

-- 4.6 proof reviewed → notify player, count punishments served
create or replace function public.on_proof_reviewed()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  r_id uuid;
begin
  if new.status = old.status then
    return new;
  end if;

  select a.riddle_id into r_id from public.answers a where a.id = new.answer_id;

  if new.status = 'approved' then
    update public.game_progress
      set punishments_served = punishments_served + 1
      where player_id = new.player_id and riddle_id = r_id;

    insert into public.notifications (user_id, type, title, body, link)
    values (new.player_id, 'punishment_approved', '💖 Punishment accepted!',
            'You may try the riddle again. Good luck, my love.',
            '/hunt');

  elsif new.status = 'rejected' then
    insert into public.notifications (user_id, type, title, body, link)
    values (new.player_id, 'punishment_rejected', '🙈 Proof rejected',
            'That will not do… upload a new proof to earn your retry!',
            '/hunt');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_proof_reviewed on public.punishment_submissions;
create trigger trg_proof_reviewed
  after update of status on public.punishment_submissions
  for each row execute function public.on_proof_reviewed();

-- ─────────────────────────────────────────────
-- 5. Row Level Security
-- ─────────────────────────────────────────────
alter table public.profiles               enable row level security;
alter table public.days                   enable row level security;
alter table public.riddles                enable row level security;
alter table public.unlock_schedule        enable row level security;
alter table public.punishments            enable row level security;
alter table public.answers                enable row level security;
alter table public.punishment_submissions enable row level security;
alter table public.game_progress          enable row level security;
alter table public.notifications          enable row level security;
alter table public.game_settings          enable row level security;
alter table public.finale                 enable row level security;

-- profiles
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin());

-- days: everyone signed in may see island titles; only admin writes
drop policy if exists "days_select_authenticated" on public.days;
create policy "days_select_authenticated" on public.days
  for select using (auth.uid() is not null);

drop policy if exists "days_write_admin" on public.days;
create policy "days_write_admin" on public.days
  for all using (public.is_admin()) with check (public.is_admin());

-- riddles: player may only read once unlocked — no peeking!
drop policy if exists "riddles_select_unlocked_or_admin" on public.riddles;
create policy "riddles_select_unlocked_or_admin" on public.riddles
  for select using (
    public.is_admin()
    or (auth.uid() is not null and public.is_riddle_unlocked(id))
  );

drop policy if exists "riddles_write_admin" on public.riddles;
create policy "riddles_write_admin" on public.riddles
  for all using (public.is_admin()) with check (public.is_admin());

-- unlock_schedule: readable by all signed-in users (needed for countdowns)
drop policy if exists "schedule_select_authenticated" on public.unlock_schedule;
create policy "schedule_select_authenticated" on public.unlock_schedule
  for select using (auth.uid() is not null);

drop policy if exists "schedule_write_admin" on public.unlock_schedule;
create policy "schedule_write_admin" on public.unlock_schedule
  for all using (public.is_admin()) with check (public.is_admin());

-- punishments: visible once the riddle is unlocked
drop policy if exists "punishments_select_unlocked_or_admin" on public.punishments;
create policy "punishments_select_unlocked_or_admin" on public.punishments
  for select using (
    public.is_admin()
    or (auth.uid() is not null and public.is_riddle_unlocked(riddle_id))
  );

drop policy if exists "punishments_write_admin" on public.punishments;
create policy "punishments_write_admin" on public.punishments
  for all using (public.is_admin()) with check (public.is_admin());

-- answers
drop policy if exists "answers_select_own_or_admin" on public.answers;
create policy "answers_select_own_or_admin" on public.answers
  for select using (player_id = auth.uid() or public.is_admin());

drop policy if exists "answers_insert_player" on public.answers;
create policy "answers_insert_player" on public.answers
  for insert with check (
    player_id = auth.uid()
    and status = 'pending'
    and public.can_submit_answer(riddle_id)
  );

drop policy if exists "answers_update_admin" on public.answers;
create policy "answers_update_admin" on public.answers
  for update using (public.is_admin());

-- punishment_submissions
drop policy if exists "psub_select_own_or_admin" on public.punishment_submissions;
create policy "psub_select_own_or_admin" on public.punishment_submissions
  for select using (player_id = auth.uid() or public.is_admin());

drop policy if exists "psub_insert_player" on public.punishment_submissions;
create policy "psub_insert_player" on public.punishment_submissions
  for insert with check (
    player_id = auth.uid()
    and status = 'pending'
    and public.can_submit_proof(answer_id, punishment_id)
  );

drop policy if exists "psub_update_admin" on public.punishment_submissions;
create policy "psub_update_admin" on public.punishment_submissions
  for update using (public.is_admin());

-- game_progress: written only by security-definer triggers + admin
drop policy if exists "progress_select_own_or_admin" on public.game_progress;
create policy "progress_select_own_or_admin" on public.game_progress
  for select using (player_id = auth.uid() or public.is_admin());

drop policy if exists "progress_write_admin" on public.game_progress;
create policy "progress_write_admin" on public.game_progress
  for all using (public.is_admin()) with check (public.is_admin());

-- notifications
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid());

drop policy if exists "notifications_insert_own_or_admin" on public.notifications;
create policy "notifications_insert_own_or_admin" on public.notifications
  for insert with check (user_id = auth.uid() or public.is_admin());

-- game_settings: readable to all signed-in, writable by admin
drop policy if exists "settings_select_authenticated" on public.game_settings;
create policy "settings_select_authenticated" on public.game_settings
  for select using (auth.uid() is not null);

drop policy if exists "settings_write_admin" on public.game_settings;
create policy "settings_write_admin" on public.game_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- finale: SECRET — players reach it only via get_finale()
drop policy if exists "finale_admin_only" on public.finale;
create policy "finale_admin_only" on public.finale
  for all using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────────────────────────────
-- 6. Storage buckets + policies
-- ─────────────────────────────────────────────

-- proofs: private — punishment proof uploads (photos, videos, audio)
insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', false)
on conflict (id) do nothing;

-- media: public — riddle images, treasure image, background music
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "proofs_insert_own_folder" on storage.objects;
create policy "proofs_insert_own_folder" on storage.objects
  for insert with check (
    bucket_id = 'proofs'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "proofs_select_owner_or_admin" on storage.objects;
create policy "proofs_select_owner_or_admin" on storage.objects
  for select using (
    bucket_id = 'proofs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "proofs_delete_owner_or_admin" on storage.objects;
create policy "proofs_delete_owner_or_admin" on storage.objects
  for delete using (
    bucket_id = 'proofs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "media_select_all" on storage.objects;
create policy "media_select_all" on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists "media_write_admin" on storage.objects;
create policy "media_write_admin" on storage.objects
  for insert with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "media_update_admin" on storage.objects;
create policy "media_update_admin" on storage.objects
  for update using (bucket_id = 'media' and public.is_admin());

drop policy if exists "media_delete_admin" on storage.objects;
create policy "media_delete_admin" on storage.objects
  for delete using (bucket_id = 'media' and public.is_admin());

-- ─────────────────────────────────────────────
-- 7. Realtime
-- ─────────────────────────────────────────────
do $$
begin
  begin
    alter publication supabase_realtime add table public.answers;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.punishment_submissions;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.game_progress;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.unlock_schedule;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.game_settings;
  exception when duplicate_object then null;
  end;
end;
$$;

-- Done! Now run `npm run seed` to create the two users and sample content.
