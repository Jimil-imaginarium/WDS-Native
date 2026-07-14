-- ═══════════════════════════════════════════════════════════════
-- Treasure Hunt ❤️ — Migration 3: Row Level Security
-- The admin can do everything. The player can only read her own
-- world — and only the parts of it the game has revealed.
-- All writes that mutate game state go through the SECURITY DEFINER
-- RPCs in migration 2, so tables stay locked down.
-- ═══════════════════════════════════════════════════════════════

alter table public.profiles            enable row level security;
alter table public.days                enable row level security;
alter table public.riddles             enable row level security;
alter table public.media               enable row level security;
alter table public.player_progress     enable row level security;
alter table public.answer_submissions  enable row level security;
alter table public.punishments         enable row level security;
alter table public.punishment_proofs   enable row level security;
alter table public.notifications       enable row level security;
alter table public.activity_logs       enable row level security;
alter table public.timeline_events     enable row level security;
alter table public.memories            enable row level security;
alter table public.secret_notes        enable row level security;
alter table public.achievements        enable row level security;
alter table public.player_achievements enable row level security;
alter table public.treasure_settings   enable row level security;

-- ── profiles ─────────────────────────────────────────────────────

create policy "profiles: read own or admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles: update own"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
  -- role changes are blocked for non-admins by the profiles_protect_role trigger

-- ── days: titles/dates are safe to show on the board ────────────

create policy "days: authenticated read"
  on public.days for select
  using (auth.uid() is not null);

create policy "days: admin write"
  on public.days for all
  using (public.is_admin())
  with check (public.is_admin());

-- ── riddles: content NEVER readable directly by the player. ─────
-- The player reads riddles exclusively through get_player_board()
-- and get_riddle_content(), which strip answers and enforce unlocks.

create policy "riddles: admin only"
  on public.riddles for all
  using (public.is_admin())
  with check (public.is_admin());

-- ── media ────────────────────────────────────────────────────────

create policy "media: admin all"
  on public.media for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "media: player read revealed media"
  on public.media for select
  using (
    -- riddle attachments & music: only once that riddle is unlocked
    (context in ('riddle', 'riddle_music')
      and riddle_id is not null
      and public.can_access_riddle(riddle_id, auth.uid()))
    -- punishment briefs: only for her own punishments
    or (context = 'punishment' and exists (
          select 1 from public.punishments p
          where p.id = media.ref_id and p.player_id = auth.uid()))
    -- her own uploads
    or uploaded_by = auth.uid()
    -- shared galleries
    or context in ('memory', 'timeline')
    -- the treasure gallery: only after the hunt is complete
    or (context in ('treasure_gallery', 'treasure_music')
        and public.player_completed_all(auth.uid()))
  );

create policy "media: player registers own proof uploads"
  on public.media for insert
  with check (context = 'proof' and uploaded_by = auth.uid());

-- ── player_progress: read own; all writes via RPCs ──────────────

create policy "progress: read own or admin"
  on public.player_progress for select
  using (player_id = auth.uid() or public.is_admin());

create policy "progress: admin write"
  on public.player_progress for all
  using (public.is_admin())
  with check (public.is_admin());

-- ── answer_submissions ───────────────────────────────────────────

create policy "submissions: read own or admin"
  on public.answer_submissions for select
  using (player_id = auth.uid() or public.is_admin());

create policy "submissions: admin write"
  on public.answer_submissions for all
  using (public.is_admin())
  with check (public.is_admin());

-- ── punishments ──────────────────────────────────────────────────

create policy "punishments: read own or admin"
  on public.punishments for select
  using (player_id = auth.uid() or public.is_admin());

create policy "punishments: admin write"
  on public.punishments for all
  using (public.is_admin())
  with check (public.is_admin());

-- ── punishment_proofs ────────────────────────────────────────────

create policy "proofs: read own or admin"
  on public.punishment_proofs for select
  using (player_id = auth.uid() or public.is_admin());

create policy "proofs: admin write"
  on public.punishment_proofs for all
  using (public.is_admin())
  with check (public.is_admin());

-- ── notifications ────────────────────────────────────────────────

create policy "notifications: read own"
  on public.notifications for select
  using (recipient_id = auth.uid());

create policy "notifications: mark own read"
  on public.notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create policy "notifications: admin insert"
  on public.notifications for insert
  with check (public.is_admin());

-- ── activity_logs: admin eyes only ───────────────────────────────

create policy "activity: admin read"
  on public.activity_logs for select
  using (public.is_admin());

-- ── extra features ───────────────────────────────────────────────

create policy "timeline: authenticated read"
  on public.timeline_events for select
  using (auth.uid() is not null);

create policy "timeline: admin write"
  on public.timeline_events for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "memories: authenticated read"
  on public.memories for select
  using (auth.uid() is not null);

create policy "memories: admin write"
  on public.memories for all
  using (public.is_admin())
  with check (public.is_admin());

-- Secret notes: both sweethearts can write to each other.
-- Notes tied to a riddle stay hidden until that riddle is completed.
create policy "notes: read revealed"
  on public.secret_notes for select
  using (
    public.is_admin()
    or author_id = auth.uid()
    or unlock_riddle_id is null
    or exists (
      select 1 from public.player_progress pp
      where pp.riddle_id = secret_notes.unlock_riddle_id
        and pp.player_id = auth.uid()
        and pp.status = 'completed'
    )
  );

create policy "notes: write own"
  on public.secret_notes for insert
  with check (author_id = auth.uid());

create policy "notes: manage own or admin"
  on public.secret_notes for update
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

create policy "notes: delete own or admin"
  on public.secret_notes for delete
  using (author_id = auth.uid() or public.is_admin());

-- ── achievements ─────────────────────────────────────────────────

create policy "achievements: authenticated read"
  on public.achievements for select
  using (auth.uid() is not null);

create policy "achievements: admin write"
  on public.achievements for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "player_achievements: read own or admin"
  on public.player_achievements for select
  using (player_id = auth.uid() or public.is_admin());

-- ── treasure_settings: revealed only at the very end ────────────

create policy "treasure: admin all"
  on public.treasure_settings for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "treasure: player read when complete"
  on public.treasure_settings for select
  using (public.player_completed_all(auth.uid()));
