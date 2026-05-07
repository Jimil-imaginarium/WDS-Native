import { useEffect, useRef, useState } from "react";
import type { ActivityState, LiveEvent, WSMessage } from "@/api/types";
import { useAuthStore } from "@/stores/authStore";

export interface LiveStationState {
  station_id: string;
  station_name?: string;
  state: ActivityState;
  fps?: number;
  conf?: number;
  last_update: string;
}

/**
 * Connects to /api/ws/live, returns a map of station_id → latest live state.
 * Auto-reconnects with exponential backoff if the socket drops.
 */
export function useLiveStations(): Record<string, LiveStationState> {
  const [stateByStation, setState] = useState<Record<string, LiveStationState>>({});
  const accessToken = useAuthStore((s) => s.accessToken);
  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef<number>(1000);
  const reconnectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      const url = `${proto}://${window.location.host}/api/ws/live?token=${encodeURIComponent(accessToken)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        backoffRef.current = 1000; // reset backoff on success
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as WSMessage;
          if (msg.type === "event") {
            const e = msg as LiveEvent;
            setState((prev) => ({
              ...prev,
              [e.station_id]: {
                station_id: e.station_id,
                station_name: e.station_name,
                state: e.state,
                fps: e.fps,
                conf: e.conf,
                last_update: e.ts,
              },
            }));
          }
        } catch {
          // ignore non-JSON
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        const delay = Math.min(backoffRef.current, 30_000);
        reconnectTimerRef.current = window.setTimeout(connect, delay);
        backoffRef.current = Math.min(backoffRef.current * 2, 30_000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [accessToken]);

  return stateByStation;
}
