"use client";

import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

/** Live admin console: submissions and proofs appear as they happen. */
export function AdminRealtime() {
  useRealtimeRefresh([
    "answer_submissions",
    "punishment_proofs",
    "player_progress",
    "punishments",
  ]);
  return null;
}
