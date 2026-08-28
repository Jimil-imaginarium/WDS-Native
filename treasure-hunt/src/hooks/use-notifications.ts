"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { NotificationRow } from "@/lib/database.types";

/**
 * Live notifications for the signed-in user: fetched with React Query
 * and pushed instantly via Supabase Realtime (with a toast).
 */
export function useNotifications(userId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async (): Promise<NotificationRow[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as NotificationRow;
          toast(n.title, { description: n.body ?? undefined });
          queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const markAllRead = async () => {
    const unread = (query.data ?? []).filter((n) => !n.read).map((n) => n.id);
    if (unread.length === 0) return;
    const supabase = createClient();
    await supabase.rpc("mark_notifications_read", { _ids: unread });
    queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
  };

  return {
    notifications: query.data ?? [],
    unreadCount: (query.data ?? []).filter((n) => !n.read).length,
    isLoading: query.isLoading,
    markAllRead,
  };
}
