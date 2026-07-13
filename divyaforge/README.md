# DivyaForge — M0 Prototype

A browser-based 3D customizer for Indian deity figurines (PRD:
`prd-divyaforge-v1.1`). M0 scope: **one deity (Ganesh), end to end** — builder,
config-based save/share, live pricing, auth, saved designs, checkout stub.

- Docs: [PLAN.md](./PLAN.md) (architecture, data model, tasks) ·
  [DECISIONS.md](./DECISIONS.md) (open choices + cultural flags)
- Stack: Next.js 14 (App Router, TS) · react-three-fiber/drei · Zustand ·
  Supabase · Tailwind · Vercel-ready

## Run it

```bash
cd divyaforge
npm install
npm run dev        # http://localhost:3000
```

That's it — with no env vars the app runs in **demo mode**: saves go to
localStorage and share links carry the design inline. To enable accounts,
cloud saves, and DB-backed orders, copy `.env.example` to `.env.local` and
fill in the Supabase values (see **Supabase setup** below).

```bash
npm test           # 39 unit tests: pricing engine, sacred-rules engine, share codec
npm run build      # production build (typechecked)
npm run assets     # regenerate placeholder part GLBs + thumbnails
```

## Demo script (what to click)

1. **Landing** (`/`) → **Start creating** → the builder loads with the
   respectful default: standing Ganesh, modak in the left hand, classic
   dhoti, lotus pedestal, Tanjore Gold palette.
2. **Deity tab** — switch **Standing ↔ Seated (Lalitasana)**. Hit
   **✦ Inspire me** (Divine Inspiration) a few times: it randomizes form,
   face, body, pose, parts, and palette — but *only within sacred-rule-valid
   combinations* (ankusha never lands in a left hand).
3. **Face tab** — drag all six sliders (Eyes goes from meditative half-closed
   to open; Trunk curl swings the trunk left/right; the right tusk stays
   short — Ekadanta).
4. **Body tab** — Height/Build sliders, then switch **2 arms → 4 arms
   (chaturbhuj)** and watch two extra hand slots appear in Ayudha. Watch the
   **price ticker** (top right) rise as the figure grows.
5. **Vastra tab** — swap the two dhotis, add the angavastram. Note the lower
   garment has no "None": the modesty rule makes it un-removable.
6. **Ayudha tab** — one section per hand, L/R aware. **Ankusha is disabled in
   left hands, pasha/modak in right hands**, each with the rule's reason
   shown on the card. Equip ankusha in a right hand, then try to equip a
   second ankusha in the other right hand — blocked (unique item).
7. **Pose tab** — Ashirwad / Dhyana / Nritya (bone-rotation presets;
   Nritya lifts a leg and tilts the figure).
8. **Base tab** — Lotus Pedestal ↔ Square Peetha; the figure re-seats on
   whatever base height loads.
9. **Color tab** — apply the three preset palettes, then tap **any zone
   directly on the murti** (or a zone chip) and recolor it with a swatch or
   the custom picker.
10. **Share tab** — name it, **Save design**, **Copy share link**, and
    **Download PNG**. Open the link in a private window: the read-only viewer
    loads the exact design with a **Customize this** fork button. Forking
    gives the visitor their own editable copy.
11. **Buy tab** — flip through the three materials and 4″/6″/8″ sizes; the
    breakdown (base + volume + parts × size) updates on every edit. **Order**
    records a `stub_created` order (no payment in M0 — the Razorpay
    integration point is marked in `src/app/api/orders/route.ts`).
12. `/designs` — open, share, or delete your saved designs.

Touch controls: one-finger rotate, two-finger pan/zoom. The layout is
mobile-first (tested at 380px).

## Live Supabase project (provisioned)

A free-tier project **divyaforge-m0** (`rgnignkmnxlfcqoazotr`, ap-south-1/Mumbai)
is already migrated + seeded. To use it, put these in `.env.local` (the anon
key is the public client key — RLS is the security boundary):

```
NEXT_PUBLIC_SUPABASE_URL=https://rgnignkmnxlfcqoazotr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbmlnbmttbnhsZmNxb2F6b3RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MjUxMDksImV4cCI6MjA5OTUwMTEwOX0.ZLjDAevLKQxk6BjR5HBgqmd9ekqmQBrxbii3ODoiBtE
```

## Deploying to Vercel

Import the repo in Vercel, set **Root Directory** to `divyaforge/`, add the
two env vars above (or none, for demo mode) — no other settings needed.
Placeholder assets are committed, so the default `next build` just works.

## Supabase setup (your own project)

Migrations and seed data live in `supabase/`:

```bash
# with the Supabase CLI linked to your project:
supabase db push          # applies supabase/migrations/0001_init.sql
psql $DB_URL -f supabase/seed.sql   # or run it in the SQL editor
```

`seed.sql` is generated — never edit it by hand:

```bash
node scripts/generate-seed-sql.mjs   # regenerates from catalog.json
```

Then set in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

New Supabase projects have email confirmation ON by default — either confirm
via the email link when signing up, or disable it under Auth → Providers →
Email for a friction-free demo.

## Architecture in 30 seconds

- **Designs are JSON parameter configs** (`schemaVersion`-ed), never meshes.
  `/d/[configId]` accepts both inline `cfg_…` ids (self-contained, work with
  zero backend) and DB shortcodes.
- **Parts are pure data** (`src/lib/catalog/data/catalog.json` → also the
  source for `supabase/seed.sql`). The renderer loads whatever GLB
  `meshUrl` points at and recolors zone meshes by name — swapping in
  artist-made parts is a file + catalog-row change, zero code.
- **Sacred-rules engine** (`src/lib/constraints/`) gates every equip in the
  UI *and* re-validates in `/api/designs` + `/api/orders`. The Divine
  Inspiration randomizer samples only allowed combinations.
- **Pricing** (`src/lib/pricing/`) is one pure function used by the live
  ticker and (authoritatively) by the orders API.
- The **placeholder body** is procedural; every **catalog part** is a real
  GLB generated by `scripts/generate-placeholder-assets.mjs` following the
  authoring conventions documented at the top of that script.
