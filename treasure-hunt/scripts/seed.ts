/**
 * The Treasure Hunt ❤️ — seed script
 *
 * Creates the two accounts (admin + player), the 4 days, 12 riddles,
 * punishments, unlock schedule and default settings.
 *
 * Usage:
 *   1. Run supabase/schema.sql in the Supabase SQL editor first.
 *   2. Fill in .env.local (see .env.example).
 *   3. npm run seed
 *
 * Safe to re-run: existing users are reused, content is upserted.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@treasurehunt.love";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "change-me-admin-123";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME ?? "Treasure Keeper";

const PLAYER_EMAIL = process.env.SEED_PLAYER_EMAIL ?? "player@treasurehunt.love";
const PLAYER_PASSWORD = process.env.SEED_PLAYER_PASSWORD ?? "change-me-player-123";
const PLAYER_NAME = process.env.SEED_PLAYER_NAME ?? "My Love";

const START_DATE = process.env.SEED_GAME_START_DATE ?? defaultStartDate();
const UTC_OFFSET = process.env.SEED_UTC_OFFSET ?? "+05:30";

/** Tomorrow, so nothing is unlocked the moment you seed. */
function defaultStartDate(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

/** Build an ISO timestamp for day N of the hunt at a local time. */
function unlockAt(dayIndex: number, time: string): string {
  const base = new Date(`${START_DATE}T00:00:00${UTC_OFFSET}`);
  const [h, m] = time.split(":").map(Number);
  const d = new Date(base.getTime() + dayIndex * 24 * 60 * 60 * 1000);
  // Re-anchor to the local wall-clock time in the given offset.
  const dateStr = new Date(d.getTime()).toISOString().slice(0, 10);
  const iso = new Date(
    `${dateStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00${UTC_OFFSET}`
  );
  return iso.toISOString();
}

const SLOT_TIMES = ["10:00", "14:00", "21:00"];

async function ensureUser(
  email: string,
  password: string,
  role: "admin" | "player",
  displayName: string
): Promise<string> {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, display_name: displayName },
  });

  if (!error && created.user) {
    console.log(`  ✓ created ${role}: ${email}`);
    // The on_auth_user_created trigger creates the profile; make sure the role stuck.
    await admin
      .from("profiles")
      .upsert({ id: created.user.id, role, display_name: displayName });
    return created.user.id;
  }

  // Already exists → look it up and update the password + role.
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listErr) throw listErr;
  const existing = list.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
  if (!existing) throw error ?? new Error(`Could not create or find ${email}`);

  await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: { role, display_name: displayName },
  });
  await admin
    .from("profiles")
    .upsert({ id: existing.id, role, display_name: displayName });
  console.log(`  ✓ reused ${role}: ${email}`);
  return existing.id;
}

interface SeedRiddle {
  title: string;
  story: string;
  question: string;
  punishment: { title: string; description: string };
}

interface SeedDay {
  title: string;
  island: string;
  story: string;
  riddles: SeedRiddle[];
}

const DAYS: SeedDay[] = [
  {
    title: "Where It All Began",
    island: "Isle of First Glances",
    story:
      "Every great treasure hunt starts at the beginning. Today we sail back to the moments that started everything — the first looks, the first laughs, the first butterflies.",
    riddles: [
      {
        title: "The First Hello",
        story:
          "Close your eyes and drift back… a nervous heartbeat, a first message, a first hello. Somewhere in our story there is a place where two strangers stopped being strangers.",
        question:
          "Where did we meet for the very first time? (Name the place!)",
        punishment: {
          title: "The Dramatic Retelling",
          description:
            "Record a 30-second dramatic re-enactment of the moment we first met. Bonus points for fake tears and slow motion.",
        },
      },
      {
        title: "The Song of Us",
        story:
          "Every love story has a soundtrack. Ours has one song that always turns the volume of the world down and the volume of us up.",
        question: "What song do we both call 'our song'?",
        punishment: {
          title: "Sing It Loud",
          description:
            "Sing the chorus of my favorite song — full feeling, full volume — and send the audio. No whispering allowed!",
        },
      },
      {
        title: "First Date Detective",
        story:
          "A table for two, nervous smiles, and someone (not naming names) talking way too fast. That evening is a treasure in itself.",
        question: "What did we eat on our first date?",
        punishment: {
          title: "Chef's Apology",
          description:
            "Take a funny selfie holding whatever snack is nearest to you, captioned 'I should have remembered the menu.'",
        },
      },
    ],
  },
  {
    title: "Little Things, Big Love",
    island: "Cove of Tiny Details",
    story:
      "Love hides in the little things — the habits, the inside jokes, the tiny details only we would ever notice. Today, the details are the map.",
    riddles: [
      {
        title: "The Guardian of My Sleep",
        story:
          "There is something of mine you always steal, and honestly… it looks better on you anyway.",
        question: "Which piece of my clothing do you steal the most?",
        punishment: {
          title: "The Hoodie Tax",
          description:
            "Wear my hoodie, strike your most dramatic model pose, and upload the photo. Work it.",
        },
      },
      {
        title: "Nickname Chronicles",
        story:
          "Real names are for strangers and paperwork. We have our own language, and it started with one silly name.",
        question: "What was the very first nickname I called you?",
        punishment: {
          title: "Twenty Times the Love",
          description:
            "Record yourself saying 'I love you' 20 times, each one in a different style — whisper, opera, robot, villain… get creative.",
        },
      },
      {
        title: "The Coffee Code",
        story:
          "I could order for you blindfolded. Could you order for me? Let's find out, barista.",
        question: "What is my usual order at our favorite café?",
        punishment: {
          title: "Barista Dance",
          description:
            "Dance for 30 seconds to any song like nobody is watching (I will be watching). Upload the video.",
        },
      },
    ],
  },
  {
    title: "Adventures & Memories",
    island: "Bay of Golden Days",
    story:
      "We have collected days like seashells — bright ones, silly ones, unforgettable ones. Today we open the shell box.",
    riddles: [
      {
        title: "The Great Escape",
        story:
          "Bags packed, playlists ready, the world waiting. One trip together beats a hundred alone.",
        question: "Where did we go on our first trip together?",
        punishment: {
          title: "Travel Vlogger",
          description:
            "Film a 30-second 'travel vlog' about the room you are currently in, narrated like it is the most exotic destination on Earth.",
        },
      },
      {
        title: "Laughing Fit",
        story:
          "There is one memory that makes us laugh every single time, no matter how many times we tell it.",
        question:
          "What is the story behind our biggest laughing fit ever? (Describe it!)",
        punishment: {
          title: "Comedy Special",
          description:
            "Tell your best joke on video. If it doesn't make me laugh, the punishment repeats. High stakes!",
        },
      },
      {
        title: "The Photo That Says It All",
        story:
          "Thousands of photos, but one of them is simply… us. The one we both come back to.",
        question:
          "Which photo of us is my absolute favorite? (Describe when/where it was taken)",
        punishment: {
          title: "Recreate the Masterpiece",
          description:
            "Recreate any photo of us as closely as you can, by yourself, using props. Upload the result next to your best guess of the original.",
        },
      },
    ],
  },
  {
    title: "The Heart of the Map",
    island: "Isle of Forever",
    story:
      "The final island. The compass no longer points north — it points to us. Three more riddles stand between you and the treasure.",
    riddles: [
      {
        title: "Dreams We Share",
        story:
          "Somewhere between 'someday' and 'promise', we built a dream we both keep coming back to.",
        question: "What is the one dream we always talk about doing together?",
        punishment: {
          title: "Architect of Dreams",
          description:
            "Draw our dream (stick figures welcome) and upload a photo of your masterpiece.",
        },
      },
      {
        title: "The Exact Moment",
        story:
          "Love doesn't arrive with fireworks. It sneaks in quietly — and then one day you just know.",
        question:
          "When did I first say 'I love you'? (Where were we, what was happening?)",
        punishment: {
          title: "The Love Monologue",
          description:
            "Record a 30-second dramatic monologue about how amazing I am. Shakespeare-level drama required.",
        },
      },
      {
        title: "X Marks the Heart",
        story:
          "The last riddle. Past every island, every chest, every clue — there was only ever one treasure on this map.",
        question:
          "What is the treasure at the end of this hunt? (Hint: look in a mirror…)",
        punishment: {
          title: "The Victory Lap",
          description:
            "So close to the treasure and still wrong?! Slow-dance with a pillow for 30 seconds and upload the evidence.",
        },
      },
    ],
  },
];

async function seed() {
  console.log("🏴‍☠️ Seeding The Treasure Hunt ❤️\n");

  console.log("👤 Users");
  const adminId = await ensureUser(ADMIN_EMAIL, ADMIN_PASSWORD, "admin", ADMIN_NAME);
  const playerId = await ensureUser(PLAYER_EMAIL, PLAYER_PASSWORD, "player", PLAYER_NAME);

  console.log("\n🗺  Days, riddles, punishments, unlock times");
  for (let d = 0; d < DAYS.length; d++) {
    const day = DAYS[d];
    const { data: dayRow, error: dayErr } = await admin
      .from("days")
      .upsert(
        {
          day_number: d + 1,
          title: day.title,
          island_name: day.island,
          story: day.story,
        },
        { onConflict: "day_number" }
      )
      .select()
      .single();
    if (dayErr) throw dayErr;

    for (let r = 0; r < day.riddles.length; r++) {
      const riddle = day.riddles[r];
      const { data: riddleRow, error: riddleErr } = await admin
        .from("riddles")
        .upsert(
          {
            day_id: dayRow.id,
            riddle_number: r + 1,
            title: riddle.title,
            story: riddle.story,
            question: riddle.question,
          },
          { onConflict: "day_id,riddle_number" }
        )
        .select()
        .single();
      if (riddleErr) throw riddleErr;

      const { error: schedErr } = await admin.from("unlock_schedule").upsert(
        {
          riddle_id: riddleRow.id,
          unlock_at: unlockAt(d, SLOT_TIMES[r]),
        },
        { onConflict: "riddle_id" }
      );
      if (schedErr) throw schedErr;

      const { error: punErr } = await admin.from("punishments").upsert(
        {
          riddle_id: riddleRow.id,
          title: riddle.punishment.title,
          description: riddle.punishment.description,
        },
        { onConflict: "riddle_id" }
      );
      if (punErr) throw punErr;
    }
    console.log(`  ✓ Day ${d + 1}: ${day.title} (3 riddles)`);
  }

  console.log("\n⚙️  Settings & finale defaults");
  await admin.from("game_settings").upsert({
    id: 1,
    game_title: "The Treasure Hunt ❤️",
    welcome_message:
      "Four days. Twelve riddles. One treasure. Made with love, just for you.",
  });
  await admin.from("finale").upsert({
    id: 1,
    treasure_title: "The Final Treasure",
    treasure_message:
      "You found it. The treasure was never gold — it was every moment that led you here. Come find me for your real prize. ❤️",
    love_letter:
      "My love,\n\nIf you are reading this, you solved every riddle — of course you did. " +
      "You know our story better than anyone, because you wrote it with me.\n\n" +
      "Every island on that map was a piece of us. Every chest you opened was a memory " +
      "I never want to lose. And this letter is a promise: the map keeps growing, " +
      "and I intend to fill every corner of it with you.\n\nForever yours. ❤️",
  });

  console.log("\n✅ Seed complete!");
  console.log(`   Admin  → ${ADMIN_EMAIL}`);
  console.log(`   Player → ${PLAYER_EMAIL}`);
  console.log(`   Day 1 unlocks: ${unlockAt(0, SLOT_TIMES[0])} (10:00 ${UTC_OFFSET})`);
  console.log("\n   Log in as admin to customize every riddle before the hunt begins. 🏴‍☠️");
  void adminId;
  void playerId;
}

seed().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
