# The Treasure Hunt ❤️

A romantic, real-time treasure hunt web app — four days, twelve riddles, one
treasure. Built as a premium, production-ready experience for exactly two
people: the **Treasure Keeper** (admin) and the **Player** (your love).

![stack](https://img.shields.io/badge/Next.js%2015-App%20Router-black) ![stack](https://img.shields.io/badge/Supabase-Auth%20·%20DB%20·%20Storage%20·%20Realtime-3ecf8e) ![stack](https://img.shields.io/badge/TailwindCSS%20·%20shadcn%2Fui%20·%20Framer%20Motion-romantic-ff69b4)

## ✨ What it does

- **4 days × 3 riddles = 12 chests** on an animated treasure map (one island per day)
- Riddles unlock on a schedule (10:00 / 14:00 / 21:00 by default) with a live
  countdown that **auto-unlocks at zero — no refresh**
- Answers are **not auto-checked**: they go to the admin as *Pending Approval*
- **Approve** → she instantly sees “✨ Correct!” (Supabase Realtime)
- **Reject** → “❌ Wrong Answer” → she must complete a **punishment** and
  upload proof (photo / video / audio / text → Supabase Storage) before
  retrying
- Admin reviews proof with inline previews, approves or demands a redo
- After riddle 12: a **cinematic finale** — chest opening, fireworks,
  confetti, love letter, and the configurable Final Treasure
- Full **admin CMS**: days, riddles, questions, stories, images, punishments,
  unlock times, welcome text, background music, treasure image, love letter —
  zero code edits needed
- Notifications + live updates everywhere via Supabase Realtime
- Dark romantic theme, glassmorphism, floating hearts, sparkles, music toggle
  (with a built-in generated music-box loop if no track is uploaded)

## 🧱 Tech stack

Next.js 15 (App Router) · TypeScript · TailwindCSS · shadcn/ui ·
Framer Motion · Supabase (Auth, Postgres, Storage, Realtime) ·
TanStack React Query · Zustand · canvas-confetti · sonner

## 🚀 Quick start

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) → New project (free tier is fine).

### 2. Run the schema

Open **SQL Editor** in the Supabase dashboard, paste the entire contents of
[`supabase/schema.sql`](supabase/schema.sql), and run it. This creates all
tables, indexes, triggers, RLS policies, storage buckets and realtime
publications.

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in from **Settings → API** in Supabase:

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (seed script only — keep secret) |

Then set the two accounts and the start date:

```env
SEED_ADMIN_EMAIL=you@example.com
SEED_ADMIN_PASSWORD=a-strong-password
SEED_PLAYER_EMAIL=her@example.com
SEED_PLAYER_PASSWORD=a-cute-password
SEED_GAME_START_DATE=2026-07-20   # day 1 of the hunt
SEED_UTC_OFFSET=+05:30            # the timezone you'll play in
```

### 4. Install, seed, run

```bash
npm install
npm run seed   # creates both users + 4 days × 3 riddles + punishments + schedule
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — log in as the admin,
open **Days & Riddles**, and rewrite the sample riddles with your own story.
Log in as the player (incognito window) to see her side.

## 🗂 Project structure

```
treasure-hunt/
├── supabase/schema.sql        # full DB schema: tables, RLS, triggers, storage, realtime
├── scripts/seed.ts            # creates users + sample 4-day hunt (npm run seed)
├── src/
│   ├── middleware.ts          # session refresh + role-based route guards
│   ├── app/
│   │   ├── login/             # shared login (role decides destination)
│   │   ├── (player)/
│   │   │   ├── hunt/          # player dashboard: map, progress, countdown
│   │   │   ├── riddle/[id]/   # riddle page: story, chest, answer flow
│   │   │   ├── punishment/[id]/ # punishment + proof upload
│   │   │   └── finale/        # cinematic ending (gated by completion)
│   │   ├── admin/             # dashboard: stats, review queues, timeline
│   │   │   ├── riddles/       # CRUD for days, riddles, punishments, unlock times
│   │   │   └── settings/      # game text, music, finale, love letter
│   │   └── auth/signout/      # sign-out route handler
│   ├── components/
│   │   ├── ui/                # shadcn/ui primitives
│   │   ├── game/              # treasure map, chest, countdown, music, bell
│   │   ├── admin/             # review queues, editors, timeline
│   │   └── effects/           # hearts, sparkles, confetti, fireworks
│   ├── hooks/                 # React Query data hooks + realtime sync
│   ├── lib/                   # supabase clients, game state machine, types
│   └── stores/                # zustand (music, celebrations)
└── DEPLOYMENT.md              # step-by-step Vercel guide
```

## 🔒 Security model

- **Supabase Auth** with two seeded accounts; roles live in `profiles.role`
- **RLS everywhere.** The player *cannot* read a riddle's content before its
  unlock time — enforced in the database, not just the UI. The finale
  (love letter, treasure) is unreadable until every riddle is approved,
  via a `security definer` function.
- Answer submissions are validated **in RLS** (`can_submit_answer`): no
  double-pending, no answering locked riddles, no skipping punishments.
- Proof uploads go to a **private** bucket, path-scoped per user; the admin
  previews them through short-lived signed URLs.
- The service-role key is used **only** by the local seed script.
- Countdowns sync to **server time** (`get_server_time()` RPC), so changing
  the device clock doesn't unlock anything early. 😉

## 🕹 Game flow (state machine)

```
locked ──(unlock_at reached)──▶ available ──(submit)──▶ answer_pending
   ▲                                ▲                        │
   │                                │approve punishment      │
   │                          punishment_pending ◀─(upload)──┤reject
   │                                                         ▼
   └──────────────  completed ◀──────(approve)────────  (rejected)
```

The same logic lives in `src/lib/game.ts` (UI) and in
`public.can_submit_answer` / `can_submit_proof` (database), so the interface
and the security layer can never disagree.

## 📜 Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run seed` | Create users + sample content (idempotent, safe to re-run) |

## 🚢 Deploying

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full Vercel guide.

---

Made with ❤️, for the one who finds it.
