import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { stationsApi } from "@/api/stations";
import type { Station } from "@/api/types";
import { useAuthStore } from "@/stores/authStore";

export default function AdminStationsPage() {
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const canWrite = user?.role === "admin" || user?.role === "plant_manager";

  const { data: stations = [], isLoading } = useQuery({
    queryKey: ["stations"],
    queryFn: stationsApi.list,
  });

  const createMut = useMutation({
    mutationFn: stationsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stations"] });
      setShowForm(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: stationsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stations"] }),
  });

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => nav("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Dashboard
            </Button>
            <div>
              <h1 className="text-lg font-bold">Stations</h1>
              <p className="text-xs text-muted-foreground">Admin · station management</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8 space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${stations.length} station${stations.length === 1 ? "" : "s"}`}
          </p>
          {canWrite && (
            <Button onClick={() => setShowForm((v) => !v)}>
              <Plus className="h-4 w-4 mr-2" /> Add station
            </Button>
          )}
        </div>

        {showForm && canWrite && (
          <CreateStationForm
            onSubmit={(payload) => createMut.mutate(payload)}
            onCancel={() => setShowForm(false)}
            isPending={createMut.isPending}
            error={createMut.error}
          />
        )}

        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground uppercase tracking-widest">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Stream URL</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Active</th>
                  {canWrite && <th className="px-4 py-3 font-medium"></th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {stations.length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan={canWrite ? 6 : 5} className="px-4 py-12 text-center text-muted-foreground">
                      No stations yet. Click <strong>Add station</strong> to create one.
                    </td>
                  </tr>
                ) : (
                  stations.map((s) => (
                    <StationRow
                      key={s.id}
                      station={s}
                      canWrite={canWrite}
                      onDelete={() => {
                        if (window.confirm(`Delete station "${s.name}"?`)) {
                          deleteMut.mutate(s.id);
                        }
                      }}
                    />
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {!canWrite && (
          <p className="text-xs text-muted-foreground text-center">
            Read-only — your role ({user?.role}) cannot add or remove stations.
          </p>
        )}
        <p className="text-xs text-muted-foreground text-center">
          Need a quick demo? Add stations like <code>Station-01</code>, <code>Station-02</code>, etc.
          The simulator publishes a fake event every second once they exist.
          <br />
          <Link to="/" className="underline">← Back to live dashboard</Link>
        </p>
      </main>
    </div>
  );
}

function StationRow({
  station, canWrite, onDelete,
}: {
  station: Station;
  canWrite: boolean;
  onDelete: () => void;
}) {
  return (
    <tr className="hover:bg-secondary/30">
      <td className="px-4 py-3 font-semibold">{station.name}</td>
      <td className="px-4 py-3 text-muted-foreground">{station.location ?? "—"}</td>
      <td className="px-4 py-3 text-muted-foreground font-mono text-xs truncate max-w-xs">
        {station.page_url ?? "—"}
      </td>
      <td className="px-4 py-3 font-mono text-xs uppercase">{station.status}</td>
      <td className="px-4 py-3">{station.is_active ? "yes" : "no"}</td>
      {canWrite && (
        <td className="px-4 py-3 text-right">
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </td>
      )}
    </tr>
  );
}

function CreateStationForm({
  onSubmit, onCancel, isPending, error,
}: {
  onSubmit: (p: { name: string; location?: string; page_url?: string }) => void;
  onCancel: () => void;
  isPending: boolean;
  error: unknown;
}) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [pageUrl, setPageUrl] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      location: location.trim() || undefined,
      page_url: pageUrl.trim() || undefined,
    });
  }

  const errorText =
    error && typeof error === "object" && "response" in error
      ? ((error as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? "Failed to create")
      : null;

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-widest">Name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Station-01" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-widest">Location</label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bay 3, Line A" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-widest">Stream URL</label>
            <Input
              value={pageUrl}
              onChange={(e) => setPageUrl(e.target.value)}
              placeholder="http://192.168.4.136:8091/"
            />
          </div>

          {errorText && (
            <p className="md:col-span-3 text-sm text-destructive">{errorText}</p>
          )}

          <div className="md:col-span-3 flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={!name.trim() || isPending}>
              {isPending ? "Creating…" : "Create station"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
