# Treasure Hunt ❤️

A luxury, cinematic, real‑time love treasure hunt — the whole thing lives in **one
file**: [`index.html`](./index.html). No build step, no `npm`, no server to run.
It talks directly to a live **Supabase** backend (database + auth + storage +
realtime), so the moment your partner submits an answer or a proof, it appears on
your admin screen **live**, and your approvals update her screen **live** — across
two different phones/laptops.

---

## ✨ How to use it (the 30‑second version)

1. Open `index.html` in any modern browser (double‑click it, or host it — see below).
2. Sign in with one of the two accounts:

   | Role | Email | Password |
   |------|-------|----------|
   | **You (Admin / Keeper)** | `admin@treasure.love` | `keeper2026` |
   | **Her (Player)** | `player@treasure.love` | `treasure2026` |

3. That's it. She plays on her device; you approve on yours. Everything syncs in real time.

> **Please change the passwords** (see *Changing passwords* below). These are the
> defaults so you can log in immediately.

---

## 📱 Getting it onto both phones

Because it's a single file wired to a cloud backend, you have easy options:

- **Simplest:** put `index.html` anywhere that serves a URL and open that URL on both
  phones. Any static host works — e.g. Netlify Drop (drag the file in), Vercel,
  GitHub Pages, Cloudflare Pages. No configuration needed.
- **No‑host option:** email/AirDrop the file to her phone and open it in the browser.
  It still connects to the same live backend, so realtime + approvals work.

Tip: once open in mobile Safari/Chrome, "Add to Home Screen" for a full‑screen,
app‑like feel.

---

## 🎮 What's already set up (live, right now)

- **4 days × 3 riddles = 12 riddles**, pre‑written with romantic clues and answers.
  Riddle 1 is already unlocked; the rest unlock at **10:00 AM, 2:00 PM, 9:00 PM** each
  day (IST), exactly as designed.
- **Two accounts** (admin + player) — no signup page, just these two hearts.
- **Full flow:** countdown timers → riddle → answer → *you* approve/reject → on reject
  you assign a **forfeit (punishment)** → she uploads proof (text/photo/video) → *you*
  approve → retry unlocks → celebration (confetti + hearts + a romantic line) → after
  all 12, the **Final Treasure** page with your letter, photo gallery and location reveal.
- **Realtime notifications**, achievements, memory gallery, our‑timeline, secret notes,
  background‑music toggle, fullscreen, photo lightbox, light/dark luxury theme.

Everything is **editable by you** from the **Admin panel** inside the app — no code needed:

- **Answers** tab — review every submitted answer (you see her answer *and* the correct
  one), approve ✨ or reject 💔 (rejecting opens the forfeit form).
- **Forfeits** tab — review uploaded proof (photo/video/text), approve ❤️ or reject 😌.
- **Riddles** tab — add/edit/delete days & riddles, change unlock times, story, hint,
  correct answer, location hint, special notes, and attach media (image/video/audio/PDF).
- **Treasure** tab — write the final message, letter and location reveal.
- **Extras** tab — add memories, timeline moments, a personalised welcome + her display
  name, and write her secret love notes.

> **Make it personal:** the seeded riddles are lovely but generic. Open **Riddles → Edit**
> and rewrite them with your real inside‑jokes, places and memories. That's what turns
> this from a demo into *your* story.

---

## 🔐 Changing passwords

The quickest way is from the Supabase dashboard: **Authentication → Users →** (pick the
user) **→ Reset/'Send password recovery'** or set a new password directly. The two users
are `admin@treasure.love` and `player@treasure.love`.

You can also share the player login with her over any private channel — she only needs the
email, password, and the URL/file.

---

## 🧠 Under the hood (for the curious)

- **Backend:** Supabase project `treasure-hunt` (region `ap-south-1`). The single HTML file
  uses the public **anon key** (safe to ship in client code) and all data access is guarded
  by **Row Level Security** — the player can only ever see her own data; only the admin can
  approve, edit riddles, or read correct answers server‑side.
- **Server logic lives in Postgres functions** (`submit_answer`, `review_submission`,
  `assign_punishment`, `submit_proof`, `review_proof`, …) so the rules ("can't skip",
  "can't retry until forfeit approved", sequential unlocks) are enforced by the database,
  not just the UI.
- **Realtime** is powered by Supabase Realtime on `notifications`, `player_progress`,
  `answer_submissions`, `punishments`, and `punishment_proofs`.
- **Storage:** `media` bucket (public) for riddle media & memories; `proofs` bucket
  (private, signed URLs) for her uploaded proof.
- **Front‑end libraries** are loaded from a CDN (`@supabase/supabase-js`, `canvas-confetti`)
  plus Google Fonts. They need internet the first time the page loads.

### Tables
`profiles · days · riddles · player_progress · answer_submissions · punishments ·
punishment_proofs · media · notifications · activity_logs · achievements ·
player_achievements · memories · timeline_events · secret_notes · treasure_settings`

---

## ❓Troubleshooting

- **Stuck on the loading heart / "Couldn't load the library":** the device has no internet
  or a network is blocking the CDN. Try another network; refresh.
- **"This riddle is not unlocked yet":** the unlock time hasn't passed, or the previous
  riddle isn't completed yet — that's by design. You can change unlock times in
  **Admin → Riddles → Edit**.
- **Login fails:** confirm the email/password above; if you changed them in Supabase, use
  the new ones.

Made with love. Every clue leads back to her. ❤️
