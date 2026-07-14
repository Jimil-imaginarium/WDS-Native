# 🔐 The Vault of Us

A private, four-day anniversary game. Over your 1 year and 5 months together, every
memory has been locked in a vault — she opens nine locks by *reliving* moments (not
answering trivia), earns nine keys, and the ninth key opens the final door: **the date**.

Everything lives in a single file — `index.html`. No build step, no dependencies, no
internet required. It works offline and looks best on a phone.

## How the game plays

| Day | Theme | Locks |
|-----|-------|-------|
| 1 | **The Beginning** — how we became us | The Moment I Knew · Five Minutes Before · The Confession |
| 2 | **The Little Things** — moments she doesn't know you kept | The Words That Stayed · The Thing You Do · Only Us |
| 3 | **The Future** — where we're going | The One You'd Save · The List · The Last Secret |
| 4 | **The Date** — the vault opens | The invitation |

Lock mechanics (already built):

- **Guess locks** — she gets 3 guesses at a "think like me" prompt. There's no wrong
  answer; after her guesses, the memory reveals itself. A "just tell me 🥺" escape
  hatch appears after the first guess.
- **Story locks** — she has to *write* something ("what happened five minutes before
  that photo?"). Her answer is the key.
- **The passphrase lock** ("Only Us") — the one lock with a real answer: your inside
  joke. Forgiving fuzzy matching, a hint after 3 misses, mercy unlock after 6.
- **The ceremony lock** ("The Last Secret") — she must press and hold a wax seal for
  3 seconds. Melodramatic on purpose. This is where your Q10 answer lives.
- Progress is saved on her phone, so she can close the tab and come back.
- At the end she gets a **"Send him your answers"** button that shares everything she
  typed back to you. That's your prize.

## The four-day schedule

She cannot binge it. The game is paced across four real days, and each lock inside a
day stays sealed until its time:

- **Day 1 starts the day she first opens the vault** (default). Day 2 is the next
  calendar day, Day 3 the day after, and Day 4 — the date reveal — the day after that.
  Locked days show *"This door opens tomorrow."* on the map.
- Prefer exact dates? Set `startDate: "2026-07-20"` to pin Day 1 (each day can also be
  pinned individually with its `opensOn`).
- **Within a day, the three locks open at set times** via each lock's `opensAt` —
  defaults are **9:00** (morning), **14:00** (afternoon), and **20:00** (evening), so
  the game follows her through the whole day. A not-yet lock shows
  *"Sealed until 8:00 PM today."*
- Days still unlock in order (Day 2 needs Day 1 finished), and Day 4 needs all nine
  keys **and** its day to arrive. The map refreshes itself when a gate opens, so if
  she's staring at the screen at 7:59 PM, the lock appears at 8:00.

## ✏️ Make it yours (the important part)

Open `index.html` and edit the `VAULT` object at the top of the `<script>` block.
Every spot that needs your real story is marked with `✏️`. Nothing below the line that
says `ENGINE` needs touching.

Your 10 answers map to these fields:

| # | Question | Where it goes |
|---|----------|---------------|
| 1 | How did you first meet? | Day 1 `epigraph` |
| 2 | Who confessed first, and how? | `the-confession` → `reveal.lines` |
| 3 | Your favorite memory together | `one-memory` → `reveal.lines` |
| 4 | *Her* favorite memory together | `one-memory` → first reveal line ("you just picked ___, am I close?") |
| 5 | Something she said casually that you never forgot | `words-that-stayed` → `reveal.lines` |
| 6 | Your inside joke | `only-us` → last line of `lines` (the setup), `accept` (answers), `hint` |
| 7 | Biggest fight (topic only) | optional last line of `one-memory` reveal |
| 8 | A habit of hers you find adorable | `the-adorable-thing` → `reveal.lines` |
| 9 | Something she's always wanted to do with you | `the-list` → `reveal.lines` |
| 10 | The thing you've never told her | `the-last-secret` → `reveal.lines` — **the emotional peak, write this one last** |

Also set:

- `herName` — turns on the name gate ("this vault opens for one person")
- `yourName` — signs the final letter
- `finale.when / time / where / note` — the actual date details
- `startDate` and each lock's `opensAt` — the four-day schedule (see above)

Writing tips baked into the placeholders: quote her exact words, name tiny sensory
details, and make every reveal contain something you've *never told her before* —
that's the reward, not the key.

## Test it, then reset it

Play through the whole thing yourself first — open **`index.html?preview`**, which
ignores every date/time gate so you can play all four days in one sitting. When you're
done, open **`index.html?reset`** once to wipe all progress (including the Day 1
anchor) before giving it to her. Send her the plain link — never the `?preview` one.

⚠️ Search the file for `✏️` before gifting — any leftover marker means a placeholder
she was never meant to see.

## Getting it to her

- **Simplest:** send her the `index.html` file directly (WhatsApp/AirDrop/email) — it
  opens in any browser, fully offline.
- **Nicer:** host it and send a link — drag the `vault-of-us` folder into Netlify Drop,
  or `vercel deploy` it, or enable GitHub Pages on a *private-content-scrubbed* copy.
  A link like `vault-of.us` or a custom short URL sells the mystery.
- Progress is stored in her browser's localStorage, so she should use the same
  browser/device for all four days.
