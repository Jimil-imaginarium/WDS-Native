# Deployment Guide — Treasure Hunt ❤️

Follow these steps once, about an hour before you want to start authoring the
hunt. Total time: ~20 minutes.

## 1. Supabase project

1. Go to [database.new](https://database.new) and create a project
   (free tier is plenty for two users).
2. Pick a strong database password and a region close to both of you.

## 2. Run the migrations

Open **SQL Editor** in the Supabase dashboard and run each file from
`supabase/migrations/` **in order**:

| # | File                    | What it creates                                  |
|---|-------------------------|--------------------------------------------------|
| 1 | `00001_schema.sql`      | Enums, all 16 tables, indexes                    |
| 2 | `00002_functions.sql`   | Game engine: RPCs, triggers, realtime publication |
| 3 | `00003_rls.sql`         | Row Level Security policies                      |
| 4 | `00004_storage.sql`     | `media` & `proofs` buckets + storage policies    |
| 5 | `00005_seed.sql`        | Achievement catalog + treasure settings row      |

Prefer the CLI? `supabase link --project-ref <ref> && supabase db push`
applies the same files.

> **Timezone note:** riddle unlock times are stored as `timestamptz`. The
> admin panel's date-time picker uses *your browser's local timezone*, so
> 10:00 means 10:00 where you live. Nothing else to configure.

## 3. Create the two accounts

Dashboard → **Authentication → Users → Add user → Create new user**
(enable **Auto Confirm User** for both):

- `you@example.com` — your admin account
- `her@example.com` — the player account

A `profiles` row is created automatically for each. Promote yourself:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

(Optional) name her and write her welcome line — also editable later in
**Admin → Extras → Player**:

```sql
update public.profiles
set display_name = 'Anna',
    welcome_message = 'Good morning, beautiful. Your adventure continues…'
where role = 'player';
```

There is deliberately **no registration page** — these two accounts are the
entire universe of this app.

## 4. Environment variables

From **Project Settings → API** copy:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

Locally: put them in `.env.local` (see `.env.example`).

## 5. Deploy to Vercel

1. Push this repository to GitHub.
2. [vercel.com/new](https://vercel.com/new) → import the repo.
3. **Root Directory**: set it to `treasure-hunt` (the app lives in this
   subfolder). Framework preset: Next.js (auto-detected).
4. Add the two environment variables above (all environments).
5. Deploy. Done — visit `/login`.

### Custom domain (optional but romantic)

Vercel → Project → Settings → Domains → add something like
`ourtreasure.love`. Also set `NEXT_PUBLIC_SITE_URL` to that URL.

## 6. Smoke test (5 minutes)

1. Sign in as **admin** → you land on `/admin`.
2. Create **Day 1** (today's date) and **Riddle 1** with an unlock time a
   few minutes in the past; fill in story, question and correct answer.
3. In a private browser window sign in as **her** → `/hunt` shows the riddle
   as current. Answer it.
4. Back in the admin tab, a notification pops instantly → **Reviews** →
   approve → her screen celebrates with confetti in realtime.
5. Submit another riddle answer and **reject** it, decree a forfeit, upload
   a proof from her side, approve it → her retry unlocks.

If all five steps work, everything (auth, RLS, RPCs, storage, realtime) is
healthy.

## Troubleshooting

| Symptom | Fix |
|---|---|
| “relation … already exists” when re-running a migration | Migrations are not idempotent by design; run each exactly once on a fresh project. |
| `alter publication` error on `00002` | Your project pre-dates the `supabase_realtime` publication — create it once: `create publication supabase_realtime;` and re-run just those lines. |
| Player sees “not unlocked yet” for an unlocked riddle | Check the riddle's `unlock_at` in **Days & Riddles**, and confirm every earlier riddle is `completed`. |
| Media doesn't render | Confirm buckets `media` / `proofs` exist and `00004_storage.sql` ran; files are served through signed URLs that expire after 6h (pages re-sign on refresh). |
| Realtime feels dead | Dashboard → Database → Replication: the five game tables must be in the `supabase_realtime` publication. |
