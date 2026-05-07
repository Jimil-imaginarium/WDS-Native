import { Activity, AlertCircle, Pause, WifiOff } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { ActivityState, Station } from "@/api/types";
import type { LiveStationState } from "@/hooks/useLiveStations";

const stateMeta: Record<
  ActivityState | "unknown",
  { label: string; bg: string; ring: string; icon: typeof Activity }
> = {
  active:      { label: "ACTIVE",     bg: "bg-green-500/15",  ring: "ring-green-500/40",  icon: Activity },
  idle:        { label: "IDLE",       bg: "bg-amber-500/15",  ring: "ring-amber-500/40",  icon: Pause },
  no_worker:   { label: "NO WORKER",  bg: "bg-slate-500/15",  ring: "ring-slate-500/40",  icon: AlertCircle },
  camera_lost: { label: "CAMERA OFF", bg: "bg-red-500/15",    ring: "ring-red-500/40",    icon: WifiOff },
  unknown:     { label: "OFFLINE",    bg: "bg-muted",         ring: "ring-border",        icon: WifiOff },
};

interface Props {
  station: Station;
  live?: LiveStationState;
}

export function StationTile({ station, live }: Props) {
  const state: ActivityState | "unknown" = live?.state ?? "unknown";
  const meta = stateMeta[state];
  const Icon = meta.icon;

  return (
    <Link
      to={`/stations/${station.id}`}
      className={cn(
        "rounded-xl p-4 ring-1 transition-all duration-200 block hover:scale-[1.02] hover:shadow-lg cursor-pointer",
        meta.bg,
        meta.ring,
        live && "shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="font-semibold truncate">{station.name}</p>
          {station.location && (
            <p className="text-xs text-muted-foreground truncate">{station.location}</p>
          )}
        </div>
        <Icon className="h-5 w-5 shrink-0 opacity-70" />
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-sm font-mono font-bold tracking-wide">{meta.label}</span>
        {live?.fps !== undefined && (
          <span className="text-[10px] font-mono text-muted-foreground">
            {live.fps.toFixed(2)} FPS
          </span>
        )}
      </div>

      {live?.last_update && (
        <p className="text-[10px] text-muted-foreground mt-1 font-mono">
          {new Date(live.last_update).toLocaleTimeString()}
        </p>
      )}
    </Link>
  );
}
