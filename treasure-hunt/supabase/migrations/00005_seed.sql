-- ═══════════════════════════════════════════════════════════════
-- Treasure Hunt ❤️ — Migration 5: Seed Data
-- Achievement catalog + the treasure settings singleton.
-- Days & riddles are authored by the admin in the admin panel
-- (or see the commented template at the bottom of this file).
-- ═══════════════════════════════════════════════════════════════

insert into public.achievements (code, title, description, icon, sort) values
  ('first_flame',     'First Flame',      'You solved your very first riddle.',                              '🕯️', 1),
  ('early_bird',      'Early Bird',       'Solved a riddle within 30 minutes of it unlocking.',              '🌅', 2),
  ('good_sport',      'Good Sport',       'Completed a forfeit with grace (and probably giggles).',          '🎭', 3),
  ('flawless_day',    'Flawless Day',     'Finished a whole day without a single wrong answer.',             '💎', 4),
  ('day_1',           'Chapter One',      'Every riddle of Day 1, conquered.',                               '🌹', 5),
  ('day_2',           'Chapter Two',      'Every riddle of Day 2, conquered.',                               '💌', 6),
  ('day_3',           'Chapter Three',    'Every riddle of Day 3, conquered.',                               '🥂', 7),
  ('day_4',           'Chapter Four',     'Every riddle of Day 4, conquered.',                               '🌙', 8),
  ('devoted_streak',  'Devoted',          'You came back for the hunt on four different days.',              '🔥', 9),
  ('treasure_hunter', 'Treasure Hunter',  'All twelve riddles solved. The treasure is yours — and so am I.', '🗝️', 10)
on conflict (code) do nothing;

insert into public.treasure_settings (id, title, message, letter, location_reveal)
values (
  true,
  'You Found It',
  'Twelve riddles. Four days. One heart — yours to keep.',
  '',
  ''
)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────
-- OPTIONAL TEMPLATE — creating the 4 days × 3 riddles skeleton.
-- The admin panel does this for you with a date picker, but if you
-- prefer SQL, adapt the dates below and uncomment. Unlock slots are
-- 10:00, 14:00 and 21:00 in YOUR timezone — replace the offset
-- (+05:30 shown here) with your own.
-- ─────────────────────────────────────────────────────────────────
-- with new_days as (
--   insert into public.days (day_number, title, subtitle, date) values
--     (1, 'Where It Began',   'Our first chapter',  date '2026-08-01'),
--     (2, 'The Middle Pages', 'Everything after',   date '2026-08-02'),
--     (3, 'Little Infinities','Moments in between', date '2026-08-03'),
--     (4, 'The Treasure',     'X marks the heart',  date '2026-08-04')
--   returning id, day_number, date
-- )
-- insert into public.riddles (day_id, riddle_number, title, unlock_at)
-- select d.id, slot.n, 'Riddle ' || slot.n,
--        (d.date::text || ' ' || slot.t || '+05:30')::timestamptz
-- from new_days d
-- cross join (values (1, '10:00'), (2, '14:00'), (3, '21:00')) as slot(n, t);
