"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to Postgres changes on the given tables and calls
 * router.refresh() (debounced) whenever anything changes — so admin
 * approvals, punishments and unlocks appear on screen instantly
 * without a manual reload.
 */
export function useRealtimeRefresh(
  tables: string[],
  options?: { onEvent?: (table: string) => void },
) {
  const router = useRouter();
  const onEventRef = useRef(options?.onEvent);
  onEventRef.current = options?.onEvent;
  const key = tables.join(",");

  useEffect(() => {
    const supabase = createClient();
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase.channel(`refresh:${key}:${Math.random().toString(36).slice(2)}`);
    for (const table of key.split(",").filter(Boolean)) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          onEventRef.current?.(table);
          if (timeout) clearTimeout(timeout);
          timeout = setTimeout(() => router.refresh(), 150);
        },
      );
    }
    channel.subscribe();

    return () => {
      if (timeout) clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [key, router]);
}
