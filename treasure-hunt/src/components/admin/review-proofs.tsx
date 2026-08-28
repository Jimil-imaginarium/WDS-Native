"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, FileQuestion, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getProofSignedUrl,
  useReviewProof,
  type AdminData,
} from "@/hooks/use-admin-data";
import { formatDateTime } from "@/lib/utils";
import type { PunishmentSubmission } from "@/lib/types";

/** Renders the uploaded proof inline: image, video, audio or text. */
function ProofPreview({ submission }: { submission: PunishmentSubmission }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (submission.proof_url) {
      getProofSignedUrl(submission.proof_url).then((u) => {
        if (!cancelled) setUrl(u);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [submission.proof_url]);

  if (submission.proof_type === "text") {
    return (
      <div className="rounded-lg bg-accent/50 p-4 text-sm italic leading-relaxed">
        “{submission.proof_text}”
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-accent/40 p-4 text-sm text-muted-foreground">
        <FileQuestion className="h-4 w-4" /> Loading proof…
      </div>
    );
  }

  switch (submission.proof_type) {
    case "photo":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Punishment proof"
          className="max-h-80 rounded-xl border border-border/60 object-contain"
        />
      );
    case "video":
      return (
        <video
          src={url}
          controls
          className="max-h-80 w-full rounded-xl border border-border/60"
        />
      );
    case "audio":
      return <audio src={url} controls className="w-full" />;
    default:
      return null;
  }
}

/** Pending punishment-proof review queue. */
export function ReviewProofs({ data }: { data: AdminData }) {
  const review = useReviewProof();

  const punishmentById = new Map(data.punishments.map((p) => [p.id, p]));
  const riddleById = new Map(data.riddles.map((r) => [r.id, r]));
  const playerById = new Map(data.players.map((p) => [p.id, p]));

  const pending = data.submissions.filter((s) => s.status === "pending");
  const recent = data.submissions
    .filter((s) => s.status !== "pending")
    .slice(0, 8);

  const act = async (id: string, status: "approved" | "rejected") => {
    try {
      await review.mutateAsync({ id, status });
      toast(
        status === "approved"
          ? "💖 Accepted — she may retry the riddle"
          : "🙈 Rejected — she must upload new proof"
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
            No punishments to judge right now. 🎭
          </CardContent>
        </Card>
      ) : (
        <AnimatePresence>
          {pending.map((submission) => {
            const punishment = punishmentById.get(submission.punishment_id);
            const riddle = punishment
              ? riddleById.get(punishment.riddle_id)
              : undefined;
            const player = playerById.get(submission.player_id);
            return (
              <motion.div
                key={submission.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 60 }}
              >
                <Card className="border-rose-400/30">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="pending">Pending</Badge>
                      <Badge variant="outline">{submission.proof_type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(submission.submitted_at)} •{" "}
                        {player?.display_name ?? "Player"}
                      </span>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">🎭 {punishment?.title}</p>
                      <p className="text-muted-foreground">
                        {punishment?.description}
                      </p>
                      {riddle && (
                        <p className="mt-1 text-xs text-muted-foreground/70">
                          For riddle: {riddle.title}
                        </p>
                      )}
                    </div>

                    <ProofPreview submission={submission} />

                    <div className="flex gap-2">
                      <Button
                        onClick={() => act(submission.id, "approved")}
                        disabled={review.isPending}
                        className="bg-emerald-600 hover:bg-emerald-500"
                      >
                        <Check className="h-4 w-4" /> Approve — allow retry
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => act(submission.id, "rejected")}
                        disabled={review.isPending}
                      >
                        <X className="h-4 w-4" /> Reject — demand new proof
                      </Button>
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
            Recently judged
          </h3>
          <div className="space-y-2">
            {recent.map((s) => {
              const punishment = punishmentById.get(s.punishment_id);
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-border/40 bg-card/40 px-4 py-2.5 text-sm"
                >
                  <span className="truncate">
                    {punishment?.title ?? "Punishment"} ({s.proof_type})
                  </span>
                  <Badge
                    variant={s.status === "approved" ? "success" : "destructive"}
                    className="ml-3 shrink-0"
                  >
                    {s.status}
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
