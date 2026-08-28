"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * Offset (ms) between the server clock and this device's clock.
 * Countdowns use server time so nobody can cheat by changing their clock. 😉
 */
export function useServerTimeOffset(): number {
  const { data } = useQuery({
    queryKey: ["server-time-offset"],
    queryFn: async () => {
      const supabase = createClient();
      const before = Date.now();
      const { data, error } = await supabase.rpc("get_server_time");
      const after = Date.now();
      if (error || !data) return 0;
      const serverMs = new Date(data as string).getTime();
      const midpoint = (before + after) / 2;
      return serverMs - midpoint;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
  return data ?? 0;
}
