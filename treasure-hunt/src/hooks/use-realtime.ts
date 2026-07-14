"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/types";

const GAME_KEYS = [
  ["map"],
  ["my-answers"],
  ["my-submissions"],
  ["notifications"],
  ["riddle"],
  ["punishment"],
  ["game-settings"],
  ["admin"],
  ["finale"],
];

/**
 * One realtime pipeline for the whole app: listens to the tables that
 * drive gameplay and invalidates the matching React Query caches, so
 * approvals, rejections and unlocks appear instantly — no refresh.
 * New notifications for the signed-in user also pop up as toasts.
 */
export function useRealtimeSync(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    const invalidateAll = () => {
      for (const key of GAME_KEYS) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    };

    const channel = supabase
      .channel(`game-sync-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "answers" },
        invalidateAll
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "punishment_submissions" },
        invalidateAll
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_progress" },
        invalidateAll
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "unlock_schedule" },
        invalidateAll
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_settings" },
        invalidateAll
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          invalidateAll();
          const n = payload.new as Notification;
          toast(n.title, { description: n.body });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
