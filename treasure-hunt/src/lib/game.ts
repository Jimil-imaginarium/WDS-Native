import type {
  Answer,
  PunishmentSubmission,
  RiddleState,
} from "@/lib/types";

/**
 * Derive the player-facing state of a riddle from its answers and
 * punishment submissions. Mirrors the SQL functions can_submit_answer /
 * can_submit_proof so UI and RLS always agree.
 */
export function getRiddleState(params: {
  unlocked: boolean;
  answers: Answer[]; // answers for THIS riddle, any order
  submissions: PunishmentSubmission[]; // submissions for THIS riddle's answers
}): RiddleState {
  const { unlocked, answers, submissions } = params;

  if (!unlocked) return "locked";
  if (answers.some((a) => a.status === "approved")) return "completed";

  const sorted = [...answers].sort(
    (a, b) =>
      new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
  );
  const latest = sorted[0];
  if (!latest) return "available";
  if (latest.status === "pending") return "answer_pending";

  // latest is rejected → punishment cycle for that answer
  const proofs = submissions.filter((s) => s.answer_id === latest.id);
  if (proofs.some((s) => s.status === "approved")) return "available";
  if (proofs.some((s) => s.status === "pending")) return "punishment_pending";
  return "punishment_required";
}

export const RIDDLE_STATE_LABEL: Record<RiddleState, string> = {
  locked: "🔒 Locked",
  available: "🗝️ Ready to solve",
  answer_pending: "⏳ Waiting for approval",
  punishment_required: "🎭 Punishment time!",
  punishment_pending: "🎭 Proof under review",
  completed: "✨ Completed",
};

/** The rejected answer that still needs a punishment served, if any. */
export function getRejectionNeedingPunishment(params: {
  answers: Answer[];
  submissions: PunishmentSubmission[];
}): Answer | null {
  const { answers, submissions } = params;
  if (answers.some((a) => a.status === "approved")) return null;
  const sorted = [...answers].sort(
    (a, b) =>
      new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
  );
  const latest = sorted[0];
  if (!latest || latest.status !== "rejected") return null;
  const proofs = submissions.filter((s) => s.answer_id === latest.id);
  if (proofs.some((s) => s.status === "approved")) return null;
  return latest;
}

export const DEFAULT_SLOT_TIMES = ["10:00", "14:00", "21:00"] as const;
