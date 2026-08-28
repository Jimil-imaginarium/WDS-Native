-- ═══════════════════════════════════════════════════════════════
-- Treasure Hunt ❤️ — Migration 1: Core Schema
-- Types, tables, indexes. Run migrations in numeric order.
-- ═══════════════════════════════════════════════════════════════

-- ── Enums ────────────────────────────────────────────────────────

create type public.user_role as enum ('admin', 'player');

-- Workflow state of a player on one riddle.
create type public.riddle_status as enum (
  'not_started',         -- can answer (if the riddle is time-unlocked)
  'answer_pending',      -- answer submitted, waiting for admin review
  'answer_rejected',     -- rejected; waiting for admin to assign punishment
  'punishment_assigned', -- punishment active; answer input disabled
  'proof_submitted',     -- proof uploaded, waiting for admin review
  'retry_unlocked',      -- punishment approved; may answer again
  'completed'            -- answer approved
);

create type public.submission_status as enum ('pending', 'approved', 'rejected');

create type public.punishment_status as enum (
  'assigned',        -- waiting for the player's proof
  'proof_submitted', -- proof uploaded, waiting for admin
  'proof_rejected',  -- proof rejected, player must re-submit
  'completed'        -- proof approved
);

create type public.proof_status as enum ('pending', 'approved', 'rejected');
create type public.proof_type   as enum ('text', 'image', 'video');

create type public.media_type as enum ('image', 'video', 'audio', 'gif', 'pdf', 'other');

create type public.media_context as enum (
  'riddle',           -- photos / videos / voice notes attached to a riddle
  'riddle_music',     -- background music for a riddle
  'punishment',       -- image / video attached to a punishment brief
  'proof',            -- player's punishment proof upload
  'treasure_gallery', -- final treasure page photo gallery
  'treasure_music',   -- final treasure page music
  'memory',           -- memory gallery
  'timeline',         -- love timeline photos
  'misc'
);

create type public.notification_type as enum (
  'riddle_unlocked',
  'answer_submitted',
  'answer_approved',
  'answer_rejected',
  'punishment_assigned',
  'proof_uploaded',
  'punishment_approved',
  'punishment_rejected',
  'treasure_found',
  'achievement_unlocked',
  'note_received'
);

-- ── Tables ───────────────────────────────────────────────────────

-- One row per auth user. Only two rows will ever exist: admin + player.
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  role            public.user_role not null default 'player',
  display_name    text not null default 'My Love',
  avatar_url      text,
  welcome_message text, -- personalized welcome shown on the player dashboard
  created_at      timestamptz not null default now()
);

create table public.days (
  id         uuid primary key default gen_random_uuid(),
  day_number int  not null unique check (day_number >= 1),
  title      text not null,
  subtitle   text,
  date       date not null, -- the calendar day this chapter takes place
  created_at timestamptz not null default now()
);

create table public.riddles (
  id                    uuid primary key default gen_random_uuid(),
  day_id                uuid not null references public.days (id) on delete cascade,
  riddle_number         int  not null check (riddle_number >= 1),
  title                 text not null,
  story                 text not null default '',
  question              text not null default '',
  hint                  text,          -- optional hint shown to the player
  correct_answer        text not null default '',  -- NEVER exposed to the player
  location_hint         text,          -- admin-only field
  special_notes         text,          -- admin-only field
  unlock_at             timestamptz not null, -- default slots: 10:00 / 14:00 / 21:00
  background_music_path text,          -- storage path in the 'media' bucket
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (day_id, riddle_number)
);

create index riddles_day_idx on public.riddles (day_id, riddle_number);

-- Generic media registry; files live in Supabase Storage.
create table public.media (
  id          uuid primary key default gen_random_uuid(),
  context     public.media_context not null,
  riddle_id   uuid references public.riddles (id) on delete cascade,
  ref_id      uuid,  -- generic reference (punishment id, proof id, …)
  bucket      text not null default 'media',
  path        text not null,
  media_type  public.media_type not null default 'image',
  caption     text,
  position    int  not null default 0,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (bucket, path)
);

create index media_riddle_idx  on public.media (riddle_id);
create index media_context_idx on public.media (context, ref_id);

-- One row per (player, riddle); created lazily by the game functions.
create table public.player_progress (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null references public.profiles (id) on delete cascade,
  riddle_id    uuid not null references public.riddles (id) on delete cascade,
  status       public.riddle_status not null default 'not_started',
  attempts     int not null default 0,
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique (player_id, riddle_id)
);

create index player_progress_player_idx on public.player_progress (player_id, status);

create table public.answer_submissions (
  id             uuid primary key default gen_random_uuid(),
  riddle_id      uuid not null references public.riddles (id) on delete cascade,
  player_id      uuid not null references public.profiles (id) on delete cascade,
  answer_text    text not null,
  status         public.submission_status not null default 'pending',
  admin_feedback text,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now()
);

create index answer_submissions_status_idx on public.answer_submissions (status, created_at desc);
create index answer_submissions_riddle_idx on public.answer_submissions (riddle_id, player_id);

create table public.punishments (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid not null references public.answer_submissions (id) on delete cascade,
  riddle_id      uuid not null references public.riddles (id) on delete cascade,
  player_id      uuid not null references public.profiles (id) on delete cascade,
  title          text not null,
  description    text not null,
  status         public.punishment_status not null default 'assigned',
  admin_feedback text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index punishments_player_idx on public.punishments (player_id, status);

create table public.punishment_proofs (
  id             uuid primary key default gen_random_uuid(),
  punishment_id  uuid not null references public.punishments (id) on delete cascade,
  player_id      uuid not null references public.profiles (id) on delete cascade,
  proof_type     public.proof_type not null,
  content_text   text,           -- for text proofs (or a caption)
  media_bucket   text,           -- 'proofs' for image / video proofs
  media_path     text,
  status         public.proof_status not null default 'pending',
  admin_feedback text,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  constraint proof_has_content check (
    content_text is not null or media_path is not null
  )
);

create index punishment_proofs_status_idx on public.punishment_proofs (status, created_at desc);

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type         public.notification_type not null,
  title        text not null,
  body         text,
  link         text,  -- in-app path, e.g. /hunt/riddle/<id>
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);

create index notifications_recipient_idx on public.notifications (recipient_id, read, created_at desc);

create table public.activity_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles (id) on delete set null,
  action     text not null,
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_logs_created_idx on public.activity_logs (created_at desc);

-- ── Extra features ───────────────────────────────────────────────

create table public.timeline_events (
  id          uuid primary key default gen_random_uuid(),
  event_date  date not null,
  title       text not null,
  description text,
  image_path  text,  -- storage path in 'media' bucket
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

create table public.memories (
  id         uuid primary key default gen_random_uuid(),
  title      text,
  caption    text,
  bucket     text not null default 'media',
  path       text not null,
  media_type public.media_type not null default 'image',
  taken_on   date,
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

create table public.secret_notes (
  id               uuid primary key default gen_random_uuid(),
  author_id        uuid not null references public.profiles (id) on delete cascade,
  title            text,
  body             text not null,
  -- If set, the note reveals itself only after this riddle is completed.
  unlock_riddle_id uuid references public.riddles (id) on delete set null,
  created_at       timestamptz not null default now()
);

create table public.achievements (
  code        text primary key,
  title       text not null,
  description text not null,
  icon        text not null default '✨', -- emoji badge
  sort        int  not null default 0
);

create table public.player_achievements (
  id               uuid primary key default gen_random_uuid(),
  player_id        uuid not null references public.profiles (id) on delete cascade,
  achievement_code text not null references public.achievements (code) on delete cascade,
  unlocked_at      timestamptz not null default now(),
  unique (player_id, achievement_code)
);

-- Singleton row for the final treasure page (id is always true).
create table public.treasure_settings (
  id              boolean primary key default true check (id),
  title           text not null default 'You Found It',
  message         text not null default 'Every clue led you here — to us.',
  letter          text not null default '',
  location_reveal text not null default '',
  music_path      text,
  updated_at      timestamptz not null default now()
);
