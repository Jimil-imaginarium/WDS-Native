# Deployment Guide — The Treasure Hunt ❤️

Ship the hunt to production in about ten minutes.

## Prerequisites

- A [Supabase](https://supabase.com) project (free tier works)
- A [Vercel](https://vercel.com) account (free tier works)
- This repository pushed to GitHub/GitLab/Bitbucket

## 1. Prepare Supabase

1. **Run the schema** — Supabase dashboard → SQL Editor → paste all of
   [`supabase/schema.sql`](supabase/schema.sql) → Run.
   This creates tables, indexes, RLS policies, triggers, the `proofs` and
   `media` storage buckets, and the realtime publication.
2. **Auth settings** — Authentication → Providers → Email:
   - Keep *Email* enabled.
   - Disable *"Allow new users to sign up"* (only your two seeded accounts
     should ever exist).
3. **Seed users & content** — locally:

   ```bash
   cp .env.example .env.local   # fill in URL, anon key, service-role key,
                                # both accounts, start date, timezone offset
   npm install
   npm run seed
   ```

   The seed is idempotent — re-run it any time to reset passwords or restore
   sample content. It never deletes your custom riddles.

## 2. Deploy to Vercel

1. Vercel → **Add New Project** → import the repository.
2. If the app lives in a subdirectory (e.g. `treasure-hunt/`), set
   **Root Directory** to it.
3. Framework preset: **Next.js** (auto-detected).
4. Add **Environment Variables** (Production + Preview):

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR-REF.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon public key |

   ⚠️ Do **not** add `SUPABASE_SERVICE_ROLE_KEY` to Vercel. It is only used
   by the local seed script, and the app never needs it at runtime.

5. **Deploy.** Vercel builds with `npm run build` and serves the app.

## 3. Post-deploy checklist

- [ ] Visit `/login`, sign in as **admin** → you land on the Treasure
      Keeper dashboard.
- [ ] Open **Days & Riddles** → confirm 4 days × 3 riddles with unlock times
      in *your* timezone.
- [ ] Open **Settings & Finale** → write the real love letter, upload a
      treasure image and (optionally) background music.
- [ ] Sign in as the **player** in a private window → confirm the map shows
      locked chests with a live countdown.
- [ ] Submit a test answer as the player → approve it as the admin in
      another tab → the player page should flip to “✨ Correct!” within a
      second, without refresh (that's Supabase Realtime working).
- [ ] Reject an answer → confirm the punishment page appears and a proof
      upload lands in the admin queue with a preview.

## 4. Custom domain (optional but romantic)

Vercel → Project → Settings → Domains → add something like
`our-treasure.love` or `hunt.yourdomain.com`. HTTPS is automatic.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Login says "that key doesn't fit" | Re-run `npm run seed` to reset passwords; check the email is exact. |
| Riddles never unlock | Check unlock times in Admin → Days & Riddles; remember they're stored in UTC and displayed in the viewer's local timezone. |
| No live updates | Schema section 7 adds tables to `supabase_realtime` — re-run `supabase/schema.sql`; also check Realtime is enabled for the project (Settings → API). |
| Proof upload fails | Confirm the `proofs` bucket exists (created by the schema) and the file is under Supabase's per-file size limit (50 MB on free tier). |
| Player can see the love letter early | Impossible via the app or API — `finale` is admin-only RLS; players only get it through `get_finale()`, which checks completion. If testing, make sure you're not signed in as admin. |

## Updating content mid-hunt

Everything is editable live from the admin dashboard — change a question,
swap a punishment, or push an unlock time later, and her app updates in
realtime. No redeploys needed.
