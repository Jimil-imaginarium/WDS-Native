"use client";

import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

/**
 * Keeps the whole player area live: admin approvals, punishments and
 * proof reviews update the screen the moment they happen.
 */
export function PlayerRealtime() {
  useRealtimeRefresh([
    "player_progress",
    "answer_submissions",
    "punishments",
    "punishment_proofs",
  ]);
  return null;
}
