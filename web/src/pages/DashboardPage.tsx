import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StationTile } from "@/components/StationTile";
import { stationsApi } from "@/api/stations";
import { useLiveStations } from "@/hooks/useLiveStations";
import { useAuthStore } from "@/stores/authStore";

export default function DashboardPage() {
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const live = useLiveStations();

  const { data: stations = [], isLoading } = useQuery({
    queryKey: ["stations"],
    queryFn: stationsApi.list,
    refetchInterval: 60_000,
  });

  function logout() {
    clear();
    nav("/login", { replace: true });
  }

  const activeCount = stations.filter((s) => live[s.id]?.state === "active").length;
  const onlineCount = stations.filter((s) => live[s.id] !== undefined).length;
  const total = stations.length;
  const activePct = total > 0 ? Math.round((activeCount / total) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">WDS Vision</h1>
            <p className="text-xs text-muted-foreground">Live workforce dashboard</p>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/admin/stations">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4 mr-2" /> Admin
              </Button>
            </Link>
            {user && (
              <div className="text-right text-sm">
                <p className="font-medium">{user.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {user.email} · <span className="font-mono">{user.role}</span>
                </p>
              </div>
            )}
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi label="Active stations" value={`${activeCount}/${total}`} />
          <Kpi label="Online" value={`${onlineCount}/${total}`} />
          <Kpi label="Active %" value={`${activePct}%`} />
          <Kpi label="WS connection" value={Object.keys(live).length > 0 ? "live" : "waiting"} />
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading stations…</p>
        ) : stations.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-lg font-semibold mb-2">No stations yet</p>
              <p className="text-muted-foreground mb-4">
                Add your first station to start collecting events.
              </p>
              <Link to="/admin/stations">
                <Button>Go to Admin → Stations</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {stations.map((s) => (
              <StationTile key={s.id} station={s} live={live[s.id]} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        WDS Vision v0.2.0 · Phase B
      </footer>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
