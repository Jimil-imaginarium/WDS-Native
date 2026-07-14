/** Default unlock slots for the three daily riddles (local time). */
export const UNLOCK_SLOTS = [
  { riddleNumber: 1, time: "10:00", label: "10:00 AM" },
  { riddleNumber: 2, time: "14:00", label: "2:00 PM" },
  { riddleNumber: 3, time: "21:00", label: "9:00 PM" },
] as const;

export const TOTAL_DAYS = 4;
export const RIDDLES_PER_DAY = 3;
export const TOTAL_RIDDLES = TOTAL_DAYS * RIDDLES_PER_DAY;

/** Romantic quotes shown in the celebration after each completed riddle. */
export const CELEBRATION_QUOTES = [
  "Every riddle solved is another reason I chose you.",
  "You unlock more than clues — you unlock me.",
  "If lost, I'd let you find me a thousand times.",
  "The best treasure I ever found was you.",
  "Clever and beautiful — how unfair to the rest of the world.",
  "Somewhere between the clues, I fell for you all over again.",
  "You and I are the best plot twist of my life.",
  "Each answer brings you closer — as if you weren't already my whole heart.",
  "I would hide a hundred treasures just to watch you smile finding them.",
  "You are the answer to questions I never knew how to ask.",
  "My favorite place in the world is next to you.",
  "The clue was always simple: it has always been you.",
] as const;

export function randomQuote() {
  return CELEBRATION_QUOTES[Math.floor(Math.random() * CELEBRATION_QUOTES.length)];
}

export const STATUS_LABELS: Record<string, string> = {
  not_started: "Ready for you",
  answer_pending: "Pending admin review",
  answer_rejected: "A forfeit is coming…",
  punishment_assigned: "Forfeit assigned",
  proof_submitted: "Proof awaiting approval",
  retry_unlocked: "Retry unlocked",
  completed: "Completed",
};

/** How long signed media URLs stay valid (seconds). */
export const SIGNED_URL_TTL = 60 * 60 * 6; // 6 hours
