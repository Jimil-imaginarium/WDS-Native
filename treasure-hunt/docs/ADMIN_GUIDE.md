# Admin Guide — running the hunt like a keeper 👑

You are the Keeper of the Treasure. Everything she experiences — every word,
photo, song, verdict and forfeit — flows through your panel at `/admin`.

## Your panel at a glance

| Page | What you do there |
|---|---|
| **Overview** | Her current day/riddle & status, pending reviews, pending proofs, completion progress, live activity timeline. |
| **Days & Riddles** | Create/edit/delete days and riddles, change unlock times, write stories, attach media & music. |
| **Reviews** | Approve / reject her answers; decree forfeits for rejections. |
| **Forfeits** | Edit/delete punishments, attach brief media, judge her proofs. |
| **Treasure** | Author the final page: title, message, letter, location reveal, gallery, music. |
| **Extras** | Memory gallery, love timeline, secret notes, her display name & welcome message. |

Everything updates live — keep the tab open and submissions/proofs appear the
moment she acts, with a notification toast.

## Authoring the hunt

### 1. Days

**Days & Riddles → New day.** Give each day a number (1–4), a calendar date,
a title and an optional subtitle (e.g. *Day 1 — “Where It Began”*).

### 2. Riddles

Inside a day, **Add riddle**. Each riddle carries:

- **Title** — shown on her map (locked riddles hide their titles).
- **Unlock time** — defaults to the day's 10:00 / 14:00 / 21:00 slot;
  change it freely with the picker.
- **Story** — the cinematic intro. Write to her. First letter gets an
  elegant drop cap.
- **Question** — what she must answer.
- **Hint** (optional) — she can reveal it herself.
- **Correct answer / Location hint / Special notes** — *private*, only you
  ever see these; the review screen shows the correct answer next to hers.
- **Media** — photos, videos, voice notes, GIFs, PDFs (up to 100 MB each).
- **Background music** — one audio file; she gets a play toggle.

> Sequence rules are automatic: she can never open a riddle before its time
> **and** before completing everything that comes before it.

### 3. The Final Treasure

**Treasure** page: title, opening message, your letter (long-form — this is
the emotional centerpiece), the real-world location reveal, a photo gallery
and music. She can only reach `/hunt/treasure` when all 12 riddles are
approved — enforced by the database, not just the UI.

## Reviewing answers

Answers wait in **Reviews** under *Waiting for you*, showing **her answer
and the correct answer side by side**. There is no auto-grading — the verdict
is always yours, so a charmingly-wrong-but-close answer can still pass.

- **Approve** (with an optional sweet note) → riddle completes, she gets
  confetti + a quote, the next countdown starts.
- **Reject** (with an optional teasing note) → her answer box locks and she
  waits for a forfeit. Choose **Reject & assign forfeit** to decree it in
  the same breath, or find it later under *Needs a forfeit*.

## The forfeit lifecycle

1. **You decree it** — title + description (quick-pick chips included:
   sing, dance, silly selfie, poem…). Attach an image/video brief afterwards
   from **Forfeits** if you like.
2. **She proves it** — text, photo or video.
3. **You judge it** — approve (her *Retry answer* unlocks instantly) or
   reject with feedback (she must submit a new proof).
4. Deleting a still-active forfeit automatically unlocks her retry.

## Extras worth using

- **Secret notes** can be *riddle-locked* — she'll only see them after
  completing the chosen riddle. Hide little rewards along the way.
- **Memories** and the **Love timeline** give her something beautiful to
  wander while waiting for the next unlock.
- **Badges** are granted automatically (first solve, flawless day, day
  completions, good sport, early bird, streaks, the final trophy).

## House rules for a great game

- Write stories in second person; reference real, specific memories.
- Keep answers forgiving — you're the judge for a reason.
- Make forfeits silly, never mean; the proof videos become keepsakes.
- Load the treasure page *before* Day 4, riddle 3 — she may finish fast.
