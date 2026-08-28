import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  Hourglass,
  Inbox,
  MapPin,
  Theater,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { relativeTime } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/constants";

const ACTION_LABELS: Record<string, string> = {
  answer_submitted: "submitted an answer",
  answer_approved: "answer approved",
  answer_rejected: "answer rejected",
  punishment_assigned: "forfeit assigned",
  proof_uploaded: "uploaded proof",
  proof_approved: "proof approved",
  proof_rejected: "proof rejected",
};

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    { data: player },
    { count: pendingReviews },
    { count: pendingProofs },
    { data: riddles },
    { data: progress },
    { data: logs },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "player").maybeSingle(),
    supabase
      .from("answer_submissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("punishment_proofs")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("riddles")
      .select("id, title, riddle_number, day_id, unlock_at"),
    supabase.from("player_progress").select("*"),
    supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const { data: days } = await supabase
    .from("days")
    .select("*")
    .order("day_number");

  const totalRiddles = riddles?.length ?? 0;
  const playerProgress = (progress ?? []).filter(
    (p) => p.player_id === player?.id,
  );
  const completed = playerProgress.filter((p) => p.status === "completed").length;

  // Where is she right now? First riddle in order without completed status.
  const orderedRiddles = (riddles ?? [])
    .map((r) => {
      const day = (days ?? []).find((d) => d.id === r.day_id);
      return { ...r, dayNumber: day?.day_number ?? 0 };
    })
    .sort((a, b) => a.dayNumber - b.dayNumber || a.riddle_number - b.riddle_number);

  const current = orderedRiddles.find(
    (r) =>
      playerProgress.find((p) => p.riddle_id === r.id)?.status !== "completed",
  );
  const currentStatus = current
    ? (playerProgress.find((p) => p.riddle_id === current.id)?.status ??
      "not_started")
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-500">
          Keeper&apos;s overview
        </p>
        <h1 className="mt-1 font-serif text-4xl">
          {player ? `${player.display_name}'s journey` : "The hunt"}
        </h1>
      </header>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">
                Current position
              </span>
            </div>
            {current ? (
              <>
                <p className="mt-2 font-serif text-2xl leading-tight">
                  Day {current.dayNumber} · Riddle {current.riddle_number}
                </p>
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                  {current.title}
                </p>
                {currentStatus && (
                  <Badge className="mt-2" variant="outline">
                    {STATUS_LABELS[currentStatus]}
                  </Badge>
                )}
              </>
            ) : (
              <p className="mt-2 font-serif text-2xl">
                {totalRiddles > 0 ? "Hunt complete 🗝️" : "No riddles yet"}
              </p>
            )}
          </CardContent>
        </Card>

        <Link href="/admin/submissions">
          <Card
            className={
              (pendingReviews ?? 0) > 0 ? "luxe-ring transition hover:shadow-luxe-lg" : ""
            }
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Inbox className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Pending reviews
                </span>
              </div>
              <p className="mt-2 font-serif text-4xl">{pendingReviews ?? 0}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                answers awaiting your verdict
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/punishments">
          <Card
            className={
              (pendingProofs ?? 0) > 0 ? "luxe-ring transition hover:shadow-luxe-lg" : ""
            }
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Theater className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Pending proofs
                </span>
              </div>
              <p className="mt-2 font-serif text-4xl">{pendingProofs ?? 0}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                forfeit proofs to judge
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium uppercase tracking-wide">
                Completed
              </span>
            </div>
            <p className="mt-2 font-serif text-4xl">
              {completed}
              <span className="text-lg text-muted-foreground"> / {totalRiddles}</span>
            </p>
            <Progress
              className="mt-3"
              value={totalRiddles ? (completed / totalRiddles) * 100 : 0}
            />
          </CardContent>
        </Card>
      </div>

      {/* Activity timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-rose-400" /> Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(logs ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Quiet for now — the story begins when she does.
            </p>
          ) : (
            <ol className="relative space-y-5 border-l border-border/60 pl-6">
              {(logs ?? []).map((log) => (
                <li key={log.id} className="relative">
                  <span className="absolute -left-[1.85rem] top-1.5 h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <p className="text-sm">
                    <span className="font-medium">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Hourglass className="h-3 w-3" />
                    {relativeTime(log.created_at)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
