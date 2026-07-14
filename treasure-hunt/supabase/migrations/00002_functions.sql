-- ═══════════════════════════════════════════════════════════════
-- Treasure Hunt ❤️ — Migration 2: Game Engine
-- Helper functions, the full game state machine (RPCs), triggers.
-- All state transitions go through SECURITY DEFINER functions so
-- the client can never fabricate progress.
-- ═══════════════════════════════════════════════════════════════

-- ── Profile bootstrap ────────────────────────────────────────────

-- Creates a profile automatically whenever an auth user is created.
-- Role can be provided via user metadata: { "role": "admin" }.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'player'),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Small helpers ────────────────────────────────────────────────

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger riddles_touch     before update on public.riddles         for each row execute function public.touch_updated_at();
create trigger punishments_touch before update on public.punishments     for each row execute function public.touch_updated_at();
create trigger progress_touch    before update on public.player_progress for each row execute function public.touch_updated_at();

-- Players must never grant themselves the admin role.
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only the admin can change roles';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

create or replace function public.log_activity(_actor uuid, _action text, _detail jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public
as $$
  insert into public.activity_logs (actor_id, action, detail)
  values (_actor, _action, _detail);
$$;

create or replace function public.notify_user(
  _recipient uuid, _type public.notification_type,
  _title text, _body text default null, _link text default null
)
returns void language sql security definer set search_path = public
as $$
  insert into public.notifications (recipient_id, type, title, body, link)
  values (_recipient, _type, _title, _body, _link);
$$;

create or replace function public.notify_admins(
  _type public.notification_type, _title text, _body text default null, _link text default null
)
returns void language sql security definer set search_path = public
as $$
  insert into public.notifications (recipient_id, type, title, body, link)
  select id, _type, _title, _body, _link
  from public.profiles where role = 'admin';
$$;

-- ── Unlock / sequencing rules ────────────────────────────────────

-- A riddle is accessible when its unlock time has passed AND every
-- earlier riddle (ordered by day number, then riddle number) is completed.
create or replace function public.can_access_riddle(_riddle uuid, _player uuid)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  t record;
begin
  select r.unlock_at, d.day_number, r.riddle_number
    into t
  from public.riddles r
  join public.days d on d.id = r.day_id
  where r.id = _riddle;

  if not found or now() < t.unlock_at then
    return false;
  end if;

  return not exists (
    select 1
    from public.riddles r2
    join public.days d2 on d2.id = r2.day_id
    where (d2.day_number, r2.riddle_number) < (t.day_number, t.riddle_number)
      and not exists (
        select 1 from public.player_progress pp
        where pp.riddle_id = r2.id
          and pp.player_id = _player
          and pp.status = 'completed'
      )
  );
end;
$$;

create or replace function public.player_completed_all(_player uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.riddles)
     and not exists (
       select 1 from public.riddles r
       where not exists (
         select 1 from public.player_progress pp
         where pp.riddle_id = r.id
           and pp.player_id = _player
           and pp.status = 'completed'
       )
     );
$$;

-- ── Read models (safe views of the game for the player) ─────────

-- The full board: one row per riddle with the caller's status.
-- Never exposes story, question, answers or hints.
create or replace function public.get_player_board()
returns table (
  riddle_id     uuid,
  day_id        uuid,
  day_number    int,
  day_title     text,
  day_subtitle  text,
  day_date      date,
  riddle_number int,
  title         text,
  unlock_at     timestamptz,
  status        public.riddle_status,
  completed_at  timestamptz,
  is_unlocked   boolean
)
language sql stable security definer set search_path = public
as $$
  select
    r.id, d.id, d.day_number, d.title, d.subtitle, d.date,
    r.riddle_number, r.title, r.unlock_at,
    coalesce(pp.status, 'not_started'),
    pp.completed_at,
    public.can_access_riddle(r.id, auth.uid())
  from public.riddles r
  join public.days d on d.id = r.day_id
  left join public.player_progress pp
    on pp.riddle_id = r.id and pp.player_id = auth.uid()
  order by d.day_number, r.riddle_number;
$$;

-- Full riddle content — only when the caller may access it.
create or replace function public.get_riddle_content(_riddle uuid)
returns table (
  id                    uuid,
  day_number            int,
  day_title             text,
  riddle_number         int,
  title                 text,
  story                 text,
  question              text,
  hint                  text,
  unlock_at             timestamptz,
  background_music_path text
)
language sql stable security definer set search_path = public
as $$
  select
    r.id, d.day_number, d.title, r.riddle_number, r.title,
    r.story, r.question, r.hint, r.unlock_at, r.background_music_path
  from public.riddles r
  join public.days d on d.id = r.day_id
  where r.id = _riddle
    and (public.is_admin() or public.can_access_riddle(_riddle, auth.uid()));
$$;

-- ── Achievements ─────────────────────────────────────────────────

create or replace function public.grant_achievement(_player uuid, _code text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  a record;
begin
  select * into a from public.achievements where code = _code;
  if not found then return; end if;

  insert into public.player_achievements (player_id, achievement_code)
  values (_player, _code)
  on conflict (player_id, achievement_code) do nothing;

  if found then
    perform public.notify_user(
      _player, 'achievement_unlocked',
      'Badge unlocked: ' || a.title, a.description, '/hunt/achievements'
    );
  end if;
end;
$$;

-- Evaluates every achievement rule after a riddle is completed.
create or replace function public.check_achievements(_player uuid, _riddle uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  completed_count int;
  d record;
  day_total int;
  day_done  int;
  had_rejection boolean;
  distinct_days int;
  r record;
begin
  select count(*) into completed_count
  from public.player_progress
  where player_id = _player and status = 'completed';

  if completed_count >= 1 then
    perform public.grant_achievement(_player, 'first_flame');
  end if;

  select d2.* into d
  from public.days d2
  join public.riddles r2 on r2.day_id = d2.id
  where r2.id = _riddle;

  select count(*) into day_total from public.riddles where day_id = d.id;
  select count(*) into day_done
  from public.player_progress pp
  join public.riddles r2 on r2.id = pp.riddle_id
  where pp.player_id = _player and pp.status = 'completed' and r2.day_id = d.id;

  if day_total > 0 and day_done = day_total then
    perform public.grant_achievement(_player, 'day_' || d.day_number);

    select exists (
      select 1 from public.answer_submissions s
      join public.riddles r2 on r2.id = s.riddle_id
      where s.player_id = _player and r2.day_id = d.id and s.status = 'rejected'
    ) into had_rejection;

    if not had_rejection then
      perform public.grant_achievement(_player, 'flawless_day');
    end if;
  end if;

  select r2.unlock_at into r
  from public.riddles r2 where r2.id = _riddle;
  if now() - r.unlock_at < interval '30 minutes' then
    perform public.grant_achievement(_player, 'early_bird');
  end if;

  select count(distinct (completed_at at time zone 'utc')::date) into distinct_days
  from public.player_progress
  where player_id = _player and status = 'completed' and completed_at is not null;
  if distinct_days >= 4 then
    perform public.grant_achievement(_player, 'devoted_streak');
  end if;

  if public.player_completed_all(_player) then
    perform public.grant_achievement(_player, 'treasure_hunter');
  end if;
end;
$$;

-- ── Player actions ───────────────────────────────────────────────

-- Submit an answer for review. Enforces the whole rulebook.
create or replace function public.submit_answer(_riddle uuid, _answer text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cur public.riddle_status;
  sid uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if _answer is null or length(trim(_answer)) = 0 then
    raise exception 'Answer cannot be empty';
  end if;
  if not public.can_access_riddle(_riddle, uid) then
    raise exception 'This riddle is not unlocked yet';
  end if;

  select status into cur
  from public.player_progress
  where player_id = uid and riddle_id = _riddle;

  if cur is not null and cur not in ('not_started', 'retry_unlocked') then
    raise exception 'You cannot answer this riddle right now (status: %)', cur;
  end if;

  insert into public.answer_submissions (riddle_id, player_id, answer_text)
  values (_riddle, uid, trim(_answer))
  returning id into sid;

  insert into public.player_progress (player_id, riddle_id, status, attempts)
  values (uid, _riddle, 'answer_pending', 1)
  on conflict (player_id, riddle_id)
  do update set status = 'answer_pending', attempts = public.player_progress.attempts + 1;

  perform public.notify_admins(
    'answer_submitted', 'New answer submitted',
    'An answer is waiting for your review.', '/admin/submissions'
  );
  perform public.log_activity(uid, 'answer_submitted',
    jsonb_build_object('riddle_id', _riddle, 'submission_id', sid));

  return sid;
end;
$$;

-- Upload proof for an assigned punishment.
create or replace function public.submit_proof(
  _punishment uuid,
  _type       public.proof_type,
  _text       text default null,
  _bucket     text default null,
  _path       text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  p record;
  pid uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into p from public.punishments
  where id = _punishment and player_id = uid;

  if not found then
    raise exception 'Punishment not found';
  end if;
  if p.status not in ('assigned', 'proof_rejected') then
    raise exception 'This punishment does not accept proof right now';
  end if;
  if _type = 'text' and (_text is null or length(trim(_text)) = 0) then
    raise exception 'Text proof cannot be empty';
  end if;
  if _type in ('image', 'video') and (_path is null or _bucket is null) then
    raise exception 'Media proof requires an uploaded file';
  end if;

  insert into public.punishment_proofs
    (punishment_id, player_id, proof_type, content_text, media_bucket, media_path)
  values (_punishment, uid, _type, nullif(trim(coalesce(_text, '')), ''), _bucket, _path)
  returning id into pid;

  update public.punishments set status = 'proof_submitted' where id = _punishment;

  update public.player_progress
  set status = 'proof_submitted'
  where player_id = uid and riddle_id = p.riddle_id;

  perform public.notify_admins(
    'proof_uploaded', 'Punishment proof uploaded',
    'She has completed her punishment — go review it.', '/admin/punishments'
  );
  perform public.log_activity(uid, 'proof_uploaded',
    jsonb_build_object('punishment_id', _punishment, 'proof_id', pid));

  return pid;
end;
$$;

-- Called by the client the moment a countdown reaches zero,
-- so the "New Riddle Unlocked" notification appears exactly once.
create or replace function public.notify_riddle_unlocked(_riddle uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  r record;
begin
  if uid is null or not public.can_access_riddle(_riddle, uid) then
    return;
  end if;

  select title into r from public.riddles where id = _riddle;

  if not exists (
    select 1 from public.notifications
    where recipient_id = uid
      and type = 'riddle_unlocked'
      and link = '/hunt/riddle/' || _riddle::text
  ) then
    perform public.notify_user(
      uid, 'riddle_unlocked', 'A new riddle awaits ✨',
      '"' || r.title || '" has unlocked.', '/hunt/riddle/' || _riddle::text
    );
  end if;
end;
$$;

create or replace function public.mark_notifications_read(_ids uuid[])
returns void
language sql security definer set search_path = public
as $$
  update public.notifications
  set read = true
  where recipient_id = auth.uid() and id = any (_ids);
$$;

-- ── Admin actions ────────────────────────────────────────────────

create or replace function public.review_submission(
  _submission uuid, _approve boolean, _feedback text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  s record;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select * into s from public.answer_submissions
  where id = _submission and status = 'pending';
  if not found then
    raise exception 'Submission not found or already reviewed';
  end if;

  update public.answer_submissions
  set status      = case when _approve then 'approved' else 'rejected' end::public.submission_status,
      admin_feedback = _feedback,
      reviewed_at = now()
  where id = _submission;

  if _approve then
    update public.player_progress
    set status = 'completed', completed_at = now()
    where player_id = s.player_id and riddle_id = s.riddle_id;

    perform public.notify_user(
      s.player_id, 'answer_approved', 'Your answer was approved ❤️',
      coalesce(_feedback, 'Beautifully done. The story continues…'),
      '/hunt/riddle/' || s.riddle_id::text
    );
    perform public.check_achievements(s.player_id, s.riddle_id);

    if public.player_completed_all(s.player_id) then
      perform public.notify_user(
        s.player_id, 'treasure_found', 'The treasure is yours 🗝️',
        'Every riddle is solved. Something is waiting for you…', '/hunt/treasure'
      );
      perform public.notify_admins(
        'treasure_found', 'She found the treasure!',
        'All riddles are complete.', '/admin'
      );
    end if;
  else
    update public.player_progress
    set status = 'answer_rejected'
    where player_id = s.player_id and riddle_id = s.riddle_id;

    perform public.notify_user(
      s.player_id, 'answer_rejected', 'Hmm… not quite 😏',
      coalesce(_feedback, 'That is not the answer I hid. A forfeit is coming your way…'),
      '/hunt/riddle/' || s.riddle_id::text
    );
  end if;

  perform public.log_activity(auth.uid(),
    case when _approve then 'answer_approved' else 'answer_rejected' end,
    jsonb_build_object('submission_id', _submission, 'riddle_id', s.riddle_id));
end;
$$;

create or replace function public.assign_punishment(
  _submission uuid, _title text, _description text
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  s record;
  pid uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select * into s from public.answer_submissions
  where id = _submission and status = 'rejected';
  if not found then
    raise exception 'Punishments can only follow a rejected submission';
  end if;

  insert into public.punishments (submission_id, riddle_id, player_id, title, description)
  values (_submission, s.riddle_id, s.player_id, _title, _description)
  returning id into pid;

  update public.player_progress
  set status = 'punishment_assigned'
  where player_id = s.player_id and riddle_id = s.riddle_id;

  perform public.notify_user(
    s.player_id, 'punishment_assigned', 'A forfeit has been decreed 👑',
    _title, '/hunt/riddle/' || s.riddle_id::text
  );
  perform public.log_activity(auth.uid(), 'punishment_assigned',
    jsonb_build_object('punishment_id', pid, 'riddle_id', s.riddle_id));

  return pid;
end;
$$;

create or replace function public.review_proof(
  _proof uuid, _approve boolean, _feedback text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  pr record;
  pu record;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select * into pr from public.punishment_proofs
  where id = _proof and status = 'pending';
  if not found then
    raise exception 'Proof not found or already reviewed';
  end if;

  select * into pu from public.punishments where id = pr.punishment_id;

  update public.punishment_proofs
  set status      = case when _approve then 'approved' else 'rejected' end::public.proof_status,
      admin_feedback = _feedback,
      reviewed_at = now()
  where id = _proof;

  if _approve then
    update public.punishments set status = 'completed' where id = pr.punishment_id;

    update public.player_progress
    set status = 'retry_unlocked'
    where player_id = pu.player_id and riddle_id = pu.riddle_id;

    perform public.notify_user(
      pu.player_id, 'punishment_approved', 'Forfeit forgiven ❤️',
      coalesce(_feedback, 'You were adorable. You may answer again.'),
      '/hunt/riddle/' || pu.riddle_id::text
    );
    perform public.grant_achievement(pu.player_id, 'good_sport');
  else
    update public.punishments set status = 'proof_rejected' where id = pr.punishment_id;

    update public.player_progress
    set status = 'punishment_assigned'
    where player_id = pu.player_id and riddle_id = pu.riddle_id;

    perform public.notify_user(
      pu.player_id, 'punishment_rejected', 'Nice try 😌',
      coalesce(_feedback, 'That proof will not do. Try again, my love.'),
      '/hunt/riddle/' || pu.riddle_id::text
    );
  end if;

  perform public.log_activity(auth.uid(),
    case when _approve then 'proof_approved' else 'proof_rejected' end,
    jsonb_build_object('proof_id', _proof, 'punishment_id', pr.punishment_id));
end;
$$;

-- ── Secret notes: whisper to the other sweetheart ────────────────

-- Notifies everyone except the author when a note is created.
-- Riddle-locked notes stay silent — they reveal themselves later.
create or replace function public.notify_note_created()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.unlock_riddle_id is null then
    insert into public.notifications (recipient_id, type, title, body, link)
    select p.id, 'note_received', 'A secret note arrived 💌',
           coalesce(new.title, 'Someone left you a little love…'),
           case when p.role = 'admin' then '/admin/extras' else '/hunt/notes' end
    from public.profiles p
    where p.id <> new.author_id;
  end if;
  return new;
end;
$$;

create trigger secret_notes_notify
  after insert on public.secret_notes
  for each row execute function public.notify_note_created();

-- ── Realtime ─────────────────────────────────────────────────────

alter publication supabase_realtime add table public.player_progress;
alter publication supabase_realtime add table public.answer_submissions;
alter publication supabase_realtime add table public.punishments;
alter publication supabase_realtime add table public.punishment_proofs;
alter publication supabase_realtime add table public.notifications;
