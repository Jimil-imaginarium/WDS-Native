import type { BoardEntry } from "@/lib/database.types";

export interface DayGroup {
  dayId: string;
  dayNumber: number;
  title: string;
  subtitle: string | null;
  date: string;
  riddles: BoardEntry[];
  completedCount: number;
}

/** Group board entries into ordered days. */
export function groupBoardByDay(board: BoardEntry[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const entry of board) {
    let group = map.get(entry.day_id);
    if (!group) {
      group = {
        dayId: entry.day_id,
        dayNumber: entry.day_number,
        title: entry.day_title,
        subtitle: entry.day_subtitle,
        date: entry.day_date,
        riddles: [],
        completedCount: 0,
      };
      map.set(entry.day_id, group);
    }
    group.riddles.push(entry);
    if (entry.status === "completed") group.completedCount++;
  }
  return [...map.values()].sort((a, b) => a.dayNumber - b.dayNumber);
}

/** The first riddle in sequence that is not yet completed. */
export function currentEntry(board: BoardEntry[]): BoardEntry | null {
  return board.find((e) => e.status !== "completed") ?? null;
}

export function completedCount(board: BoardEntry[]) {
  return board.filter((e) => e.status === "completed").length;
}

export function allCompleted(board: BoardEntry[]) {
  return board.length > 0 && board.every((e) => e.status === "completed");
}

/**
 * The countdown target for the player dashboard: the unlock time of
 * the current riddle, if it's still in the future.
 */
export function nextUnlock(board: BoardEntry[]): BoardEntry | null {
  const current = currentEntry(board);
  if (!current) return null;
  if (new Date(current.unlock_at).getTime() > Date.now()) return current;
  return null;
}

/**
 * Consecutive-day streak: number of consecutive calendar days ending
 * today (or yesterday) with at least one completed riddle.
 */
export function dailyStreak(board: BoardEntry[]): number {
  const days = new Set(
    board
      .filter((e) => e.completed_at)
      .map((e) => new Date(e.completed_at as string).toDateString()),
  );
  if (days.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  // A streak may end yesterday and still count.
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** True while the player must wait for the admin or a punishment. */
export function isInputLocked(status: BoardEntry["status"]) {
  return (
    status === "answer_pending" ||
    status === "answer_rejected" ||
    status === "punishment_assigned" ||
    status === "proof_submitted" ||
    status === "completed"
  );
}
