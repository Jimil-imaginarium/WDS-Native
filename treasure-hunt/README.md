# Treasure Hunt ❤️

A luxury, interactive love story — a private four-day treasure hunt built for
exactly two people: **the Admin** (you) and **the Player** (her).

Twelve riddles across four days. Each day, riddles unlock at **10:00 AM**,
**2:00 PM** and **9:00 PM** behind a live cinematic countdown. Every answer is
reviewed by you personally; wrong answers earn a playful *forfeit* she must
complete (and prove!) before she may try again. When the twelfth riddle falls,
the Final Treasure page opens: your letter, your photos, your music, and the
real-world location where her gift is hidden.

Design language: Apple × Notion × luxury wedding invitation. Soft pink, rose
gold, cream, glassmorphism, serif display type, and Framer Motion everywhere.
Dark mode included. No cartoons. No clip art. Just the two of you.

---

## Tech stack

| Layer      | Choice                                                     |
| ---------- | ---------------------------------------------------------- |
| Framework  | Next.js 15 (App Router, Server Components, Server Actions) |
| Language   | TypeScript (strict)                                        |
| Styling    | TailwindCSS + shadcn-style primitives + Framer Motion      |
| Icons      | Lucide                                                      |
| Backend    | Supabase (PostgreSQL, Auth, Storage, Realtime)             |
| Validation | Zod                                                         |
| Data       | React Query (notifications) + RSC + realtime refresh       |
| Deploy     | Vercel                                                      |

## Feature map

- **Sequential game engine** — riddles unlock strictly in order and only after
  their scheduled time; all rules enforced in PostgreSQL
  (`SECURITY DEFINER` RPCs + Row Level Security), never in the browser.
- **Live countdowns** — second-accurate timers that unlock the next riddle
  automatically. No refresh needed.
- **Human answer review** — answers go to *Pending admin review*; you approve
  or reject from the admin panel and she sees the verdict instantly
  (Supabase Realtime).
- **Punishment system** — reject an answer, decree a forfeit (title,
  description, optional image/video). She uploads proof (text / photo /
  video); only your approval re-enables her answer box.
- **Rich riddle media** — photos, videos, voice notes, GIFs, PDFs and
  per-riddle background music, all stored in private Supabase Storage buckets
  and served via signed URLs.
- **Celebrations** — confetti, floating hearts and a romantic quote after
  every approved answer.
- **Final treasure page** — tap-to-open reveal, your letter, photo gallery,
  music, and the final location. Fully editable in the admin panel.
- **Extras** — love timeline, memory gallery, two-way secret notes
  (optionally riddle-locked), achievements & badges, daily streak,
  personalized welcome, background-music toggle, fullscreen mode, photo
  lightbox, animated loading screens, live notifications.

## Project structure

```
treasure-hunt/
├── supabase/migrations/       # 5 ordered SQL migrations (schema → seed)
├── src/
│   ├── app/
│   │   ├── login/             # elegant sign-in
│   │   ├── hunt/              # PLAYER: dashboard, riddles, treasure,
│   │   │                      #   memories, timeline, notes, badges
│   │   └── admin/             # ADMIN: overview, days & riddles, reviews,
│   │                          #   forfeits, treasure, extras
│   ├── components/            # UI primitives + countdown, celebration,
│   │                          #   lightbox, media gallery, notifications…
│   ├── hooks/                 # useCountdown, useRealtimeRefresh,
│   │                          #   useNotifications, useMediaUpload…
│   ├── lib/                   # supabase clients, types, game logic, zod
│   └── server/actions/        # Server Actions (auth / player / admin)
└── docs/                      # deployment, admin & player guides
```

## Quick start

1. **Create a Supabase project** at [database.new](https://database.new).
2. **Run the migrations** in order (SQL Editor → paste each file, or
   `supabase db push` with the CLI):
   `00001_schema.sql` → `00002_functions.sql` → `00003_rls.sql` →
   `00004_storage.sql` → `00005_seed.sql`.
3. **Create the two users** (Dashboard → Authentication → Add user →
   "Create new user", with *Auto Confirm* on):
   - you (the admin) — then promote yourself:
     ```sql
     update public.profiles set role = 'admin'
     where id = (select id from auth.users where email = 'you@example.com');
     ```
   - her (the player) — she stays `player` (the default). Optionally set her
     name: `update public.profiles set display_name = 'Anna' where role = 'player';`
4. **Configure env vars**:
   ```bash
   cp .env.example .env.local
   # fill NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```
5. **Run it**:
   ```bash
   npm install
   npm run dev
   ```
6. Sign in as admin → **Days & Riddles** → create Day 1 and its three
   riddles. The unlock times default to 10:00 / 14:00 / 21:00 of the day's
   date (your local timezone) and are freely editable.

Full guides: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) ·
[docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) ·
[docs/PLAYER_GUIDE.md](docs/PLAYER_GUIDE.md)

## Security model

- **Row Level Security everywhere.** The player can read only her own
  progress, submissions, punishments, proofs and notifications.
- **Riddle content is never directly readable** by the player. It is served
  through `SECURITY DEFINER` functions (`get_player_board`,
  `get_riddle_content`) that enforce time-and-sequence unlocking server-side;
  `correct_answer`, `location_hint` and `special_notes` never leave the
  database for her role.
- **All state transitions** (submit answer, approve/reject, assign
  punishment, submit/review proof) run inside database functions with
  explicit role checks — the client cannot fabricate progress.
- **Storage is private.** Two buckets (`media`, `proofs`) with per-role
  policies; files are served via short-lived signed URLs. Proofs live under
  the player's own folder and are readable only by her and the admin.
- Players cannot escalate their own role (guarded by a trigger).

## Realtime

`player_progress`, `answer_submissions`, `punishments`, `punishment_proofs`
and `notifications` are in the `supabase_realtime` publication. Both apps
subscribe and refresh instantly: approvals, rejections, forfeits and proof
verdicts appear with no reload, and notifications arrive as live toasts.
