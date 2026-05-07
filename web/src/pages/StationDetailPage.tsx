import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { stationsApi } from "@/api/stations";
import { useLiveStations } from "@/hooks/useLiveStations";
import { useAuthStore } from "@/stores/authStore";
import type { ActivityState } from "@/api/types";
import { cn } from "@/lib/utils";

const stateColours: Record<ActivityState, string> = {
  active: "bg-green-500",
  idle: "bg-amber-500",
  no_worker: "bg-slate-500",
  camera_lost: "bg-red-500",
};

export default function StationDetailPage() {
  const { stationId = "" } = useParams();
  const nav = useNavigate();
  const live = useLiveStations();
  const liveState = live[stationId];
  const [previewBust, setPreviewBust] = useState(0);
  const accessToken = useAuthStore((s) => s.accessToken);

  const { data: station } = useQuery({
    queryKey: ["station", stationId],
    queryFn: () => stationsApi.get(stationId),
    enabled: !!stationId,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["station-events", stationId],
    queryFn: () => stationsApi.recentEvents(stationId, 30),
    refetchInterval: 5000,
    enabled: !!stationId,
  });

  // Force preview <img> reload at 4 fps so the live frame updates
  useEffect(() => {
    const id = setInterval(() => setPreviewBust((b) => b + 1), 250);
    return () => clearInterval(id);
  }, []);

  // Build a tiny histogram of states over the recent window
  const stateBuckets = useMemo(() => {
    const counts = { active: 0, idle: 0, no_worker: 0, camera_lost: 0 } as Record<ActivityState, number>;
    for (const e of events) counts[e.state] += 1;
    const total = events.length || 1;
    return Object.entries(counts).map(([s, n]) => ({
      state: s as ActivityState,
      count: n,
      pct: Math.round((n / total) * 100),
    }));
  }, [events]);

  if (!station) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading station…</p>
      </div>
    );
  }

  const previewUrl = `/api/stations/${stationId}/preview?t=${previewBust}&token=${encodeURIComponent(accessToken ?? "")}`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => nav("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Dashboard
            </Button>
            <div>
              <h1 className="text-lg font-bold">{station.name}</h1>
              <p className="text-xs text-muted-foreground">
                {station.location ?? "—"}
                {station.page_url && (
                  <>
                    {" · "}
                    <span className="font-mono">{station.page_url}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Live preview ───────────────────────────────────────────── */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Live preview</span>
              {liveState && (
                <span className="flex items-center gap-2 text-sm font-mono">
                  <span className={cn("w-2.5 h-2.5 rounded-full", stateColours[liveState.state])} />
                  {liveState.state.toUpperCase()}
                  {liveState.fps !== undefined && (
                    <span className="text-muted-foreground"> · {liveState.fps.toFixed(2)} FPS</span>
                  )}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
              <img
                src={previewUrl}
                alt={`${station.name} preview`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Hide broken image icon when no frame yet — browser shows alt text instead
                  (e.target as HTMLImageElement).style.opacity = "0.2";
                }}
                onLoad={(e) => {
                  (e.target as HTMLImageElement).style.opacity = "1";
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Stream: <span className="font-mono">{station.page_url ?? "(none)"}</span> ·
              annotated frame is re-encoded by the inference container.
            </p>
          </CardContent>
        </Card>

        {/* ── Live KPIs ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Now</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Kv label="State" value={liveState?.state.toUpperCase() ?? "OFFLINE"} />
            <Kv label="FPS" value={liveState?.fps?.toFixed(2) ?? "—"} />
            <Kv label="Confidence" value={liveState?.conf?.toFixed(2) ?? "—"} />
            <Kv label="Last update" value={liveState ? new Date(liveState.last_update).toLocaleTimeString() : "—"} />
            <Kv label="Status" value={station.status} />
            <Kv label="Active" value={station.is_active ? "yes" : "no"} />
            <Kv label="Detector" value="MediaPipe + 6-frame hysteresis" />
          </CardContent>
        </Card>

        {/* ── Recent state distribution ─────────────────────────────── */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Last 30 minutes</span>
              <span className="text-xs text-muted-foreground font-mono">
                {events.length} events
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-2 h-6 px-2"
                  onClick={() => stationsApi.recentEvents(stationId)}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stateBuckets.map((b) => (
                <div key={b.state} className="flex items-center gap-3">
                  <div className="w-24 text-xs uppercase font-mono">{b.state.replace("_", " ")}</div>
                  <div className="flex-1 h-3 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn("h-full", stateColours[b.state])}
                      style={{ width: `${b.pct}%` }}
                    />
                  </div>
                  <div className="w-16 text-xs font-mono text-right">{b.pct}%</div>
                  <div className="w-12 text-xs font-mono text-right text-muted-foreground">{b.count}</div>
                </div>
              ))}
              {events.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No events yet — wait a few seconds, or check{" "}
                  <Link to="/admin/stations" className="underline">stream URL</Link>.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        WDS Vision v0.3.0 · Phase C — real MediaPipe inference
      </footer>
    </div>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground uppercase tracking-widest">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
