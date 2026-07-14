"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Check,
  Crown,
  Inbox,
  Loader2,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createPunishment, reviewSubmission } from "@/server/actions/admin";
import { formatDateTime } from "@/lib/utils";
import type { SubmissionStatus } from "@/lib/database.types";

export interface SubmissionView {
  id: string;
  answerText: string;
  status: SubmissionStatus;
  adminFeedback: string | null;
  createdAt: string;
  reviewedAt: string | null;
  riddleTitle: string;
  riddleNumber: number;
  dayNumber: number;
  correctAnswer: string;
  hasPunishment: boolean;
}

const PUNISHMENT_IDEAS = [
  { title: "Sing for me", description: "Record yourself singing the chorus of our song — with feeling!" },
  { title: "Dance break", description: "Film a 20-second victory dance. Bonus points for commitment." },
  { title: "Funny selfie", description: "Take the silliest selfie you can manage and send it as proof." },
  { title: "Poet laureate", description: "Write me a four-line poem about why I'm irresistible." },
];

export function SubmissionsBoard({
  submissions,
}: {
  submissions: SubmissionView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [approveDialog, setApproveDialog] = useState<SubmissionView | null>(null);
  const [rejectDialog, setRejectDialog] = useState<SubmissionView | null>(null);
  const [punishDialog, setPunishDialog] = useState<SubmissionView | null>(null);
  const [feedback, setFeedback] = useState("");
  const [punishTitle, setPunishTitle] = useState("");
  const [punishDescription, setPunishDescription] = useState("");

  const pendingList = submissions.filter((s) => s.status === "pending");
  const needsForfeit = submissions.filter(
    (s) => s.status === "rejected" && !s.hasPunishment,
  );
  const history = submissions.filter((s) => s.status !== "pending");

  const approve = () => {
    if (!approveDialog) return;
    startTransition(async () => {
      const result = await reviewSubmission({
        submissionId: approveDialog.id,
        approve: true,
        feedback: feedback.trim() || undefined,
      });
      if (result.ok) {
        toast("Approved — she'll see the celebration instantly 🎉");
        setApproveDialog(null);
        setFeedback("");
        router.refresh();
      } else toast.error(result.error);
    });
  };

  const reject = (thenPunish: boolean) => {
    if (!rejectDialog) return;
    const submission = rejectDialog;
    startTransition(async () => {
      const result = await reviewSubmission({
        submissionId: submission.id,
        approve: false,
        feedback: feedback.trim() || undefined,
      });
      if (result.ok) {
        toast("Rejected 😏");
        setRejectDialog(null);
        setFeedback("");
        if (thenPunish) {
          setPunishTitle("");
          setPunishDescription("");
          setPunishDialog(submission);
        }
        router.refresh();
      } else toast.error(result.error);
    });
  };

  const punish = () => {
    if (!punishDialog) return;
    startTransition(async () => {
      const result = await createPunishment({
        submissionId: punishDialog.id,
        title: punishTitle,
        description: punishDescription,
      });
      if (result.ok) {
        toast("Forfeit decreed 👑 — she's been notified");
        setPunishDialog(null);
        router.refresh();
      } else toast.error(result.error);
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-500">
          The verdict is yours
        </p>
        <h1 className="mt-1 font-serif text-4xl">Answer Reviews</h1>
      </header>

      {/* Pending queue */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl">
          <Inbox className="h-5 w-5 text-rose-400" /> Waiting for you
          {pendingList.length > 0 && <Badge>{pendingList.length}</Badge>}
        </h2>

        {pendingList.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              Nothing to review — she&apos;s still puzzling…
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingList.map((s) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="luxe-ring">
                  <CardContent className="p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Day {s.dayNumber} · Riddle {s.riddleNumber} —{" "}
                        <span className="text-foreground">{s.riddleTitle}</span>
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(s.createdAt)}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-rose-100/50 p-4 dark:bg-rose-950/25">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-500">
                          Her answer
                        </p>
                        <p className="mt-1 font-serif text-xl">“{s.answerText}”</p>
                      </div>
                      <div className="rounded-2xl bg-emerald-500/10 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                          Correct answer
                        </p>
                        <p className="mt-1 font-serif text-xl">
                          {s.correctAnswer || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 flex gap-3">
                      <Button
                        className="flex-1"
                        onClick={() => {
                          setFeedback("");
                          setApproveDialog(s);
                        }}
                      >
                        <ThumbsUp /> Approve
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                          setFeedback("");
                          setRejectDialog(s);
                        }}
                      >
                        <ThumbsDown /> Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Rejected without a forfeit yet */}
      {needsForfeit.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 font-serif text-2xl">
            <Crown className="h-5 w-5 text-gold-500" /> Needs a forfeit
          </h2>
          <div className="space-y-3">
            {needsForfeit.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <p className="text-sm font-medium">
                      Day {s.dayNumber} · Riddle {s.riddleNumber} — “
                      {s.answerText}”
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Rejected {s.reviewedAt ? formatDateTime(s.reviewedAt) : ""}
                      — she&apos;s waiting for her punishment.
                    </p>
                  </div>
                  <Button
                    variant="gold"
                    onClick={() => {
                      setPunishTitle("");
                      setPunishDescription("");
                      setPunishDialog(s);
                    }}
                  >
                    <Crown /> Assign forfeit
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* History */}
      <section>
        <h2 className="mb-4 font-serif text-2xl">History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No verdicts yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/50 bg-background/50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    <span className="text-muted-foreground">
                      D{s.dayNumber}·R{s.riddleNumber}
                    </span>{" "}
                    “{s.answerText}”
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.reviewedAt ? formatDateTime(s.reviewedAt) : ""}
                  </p>
                </div>
                {s.status === "approved" ? (
                  <Badge variant="success">
                    <Check className="h-3 w-3" /> Approved
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <X className="h-3 w-3" /> Rejected
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Approve dialog */}
      <Dialog
        open={!!approveDialog}
        onOpenChange={(open) => !open && setApproveDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve her answer?</DialogTitle>
            <DialogDescription>
              “{approveDialog?.answerText}” — this completes the riddle and
              starts the next unlock timer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>A sweet word back (optional)</Label>
            <Textarea
              rows={2}
              value={feedback}
              placeholder="Clever girl. I never doubted you…"
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={approve} disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog
        open={!!rejectDialog}
        onOpenChange={(open) => !open && setRejectDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this answer?</DialogTitle>
            <DialogDescription>
              She won&apos;t be able to retry until a forfeit is completed and
              approved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>A teasing note (optional)</Label>
            <Textarea
              rows={2}
              value={feedback}
              placeholder="So close… and yet so far. 😏"
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => reject(false)}
              disabled={pending}
            >
              Reject only
            </Button>
            <Button variant="destructive" onClick={() => reject(true)} disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Reject & assign
              forfeit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Punishment dialog */}
      <Dialog
        open={!!punishDialog}
        onOpenChange={(open) => !open && setPunishDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decree a forfeit 👑</DialogTitle>
            <DialogDescription>
              She must complete it and upload proof before she can answer
              again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {PUNISHMENT_IDEAS.map((idea) => (
                <button
                  key={idea.title}
                  type="button"
                  onClick={() => {
                    setPunishTitle(idea.title);
                    setPunishDescription(idea.description);
                  }}
                  className="rounded-full border border-border/60 px-3 py-1 text-xs transition hover:border-rose-300 hover:bg-rose-50/40 dark:hover:bg-rose-950/20"
                >
                  {idea.title}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={punishTitle}
                placeholder="Sing for me"
                onChange={(e) => setPunishTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={punishDescription}
                placeholder="Record yourself singing the chorus of our song…"
                onChange={(e) => setPunishDescription(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              You can attach an image or video to the forfeit afterwards, from
              the Forfeits page.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="gold"
              onClick={punish}
              disabled={pending || !punishTitle.trim() || !punishDescription.trim()}
            >
              {pending && <Loader2 className="animate-spin" />} Decree it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
