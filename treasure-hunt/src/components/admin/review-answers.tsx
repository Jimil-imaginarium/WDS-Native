"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useReviewAnswer, type AdminData } from "@/hooks/use-admin-data";
import { formatDateTime } from "@/lib/utils";

/** Pending-answer review queue + recent history. */
export function ReviewAnswers({ data }: { data: AdminData }) {
  const review = useReviewAnswer();

  const riddleById = new Map(data.riddles.map((r) => [r.id, r]));
  const playerById = new Map(data.players.map((p) => [p.id, p]));

  const pending = data.answers.filter((a) => a.status === "pending");
  const recent = data.answers.filter((a) => a.status !== "pending").slice(0, 10);

  const act = async (id: string, status: "approved" | "rejected") => {
    try {
      await review.mutateAsync({ id, status });
      toast(
        status === "approved" ? "✨ Approved — she'll see it instantly" : "❌ Rejected — punishment unlocked"
      );
    } catch {
      toast.error("Action failed, try again");
    }
  };

  return (
    <div className="space-y-6">
      {pending.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            No answers waiting. The seas are calm… ⚓
          </CardContent>
        </Card>
      ) : (
        <AnimatePresence>
          {pending.map((answer) => {
            const riddle = riddleById.get(answer.riddle_id);
            const player = playerById.get(answer.player_id);
            return (
              <motion.div
                key={answer.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 60 }}
              >
                <Card className="border-pink-400/30">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="pending">Pending</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(answer.submitted_at)} •{" "}
                            {player?.display_name ?? "Player"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {riddle?.title} — “{riddle?.question}”
                        </p>
                        <p className="mt-2 rounded-lg bg-accent/50 p-3 font-display text-lg">
                          “{answer.answer_text}”
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          onClick={() => act(answer.id, "approved")}
                          disabled={review.isPending}
                          className="bg-emerald-600 hover:bg-emerald-500"
                        >
                          <Check className="h-4 w-4" /> Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => act(answer.id, "rejected")}
                          disabled={review.isPending}
                        >
                          <X className="h-4 w-4" /> Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}

      {recent.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Recently reviewed
          </h3>
          <div className="space-y-2">
            {recent.map((answer) => {
              const riddle = riddleById.get(answer.riddle_id);
              return (
                <div
                  key={answer.id}
                  className="flex items-center justify-between rounded-lg border border-border/40 bg-card/40 px-4 py-2.5 text-sm"
                >
                  <div className="min-w-0 flex-1 truncate">
                    <span className="text-muted-foreground">{riddle?.title}: </span>
                    “{answer.answer_text}”
                  </div>
                  <Badge
                    variant={answer.status === "approved" ? "success" : "destructive"}
                    className="ml-3 shrink-0"
                  >
                    {answer.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
