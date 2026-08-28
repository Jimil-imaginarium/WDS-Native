"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Crown,
  Hourglass,
  Loader2,
  Pencil,
  Theater,
  ThumbsDown,
  ThumbsUp,
  Trash2,
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
import { MediaManager, type ManagedMedia } from "@/components/admin/media-manager";
import {
  deletePunishment,
  reviewProof,
  updatePunishment,
} from "@/server/actions/admin";
import { formatDateTime } from "@/lib/utils";
import type {
  ProofStatus,
  ProofType,
  PunishmentStatus,
} from "@/lib/database.types";

export interface AdminProofView {
  id: string;
  punishmentId: string;
  proofType: ProofType;
  contentText: string | null;
  mediaUrl: string | null;
  status: ProofStatus;
  adminFeedback: string | null;
  createdAt: string;
}

export interface AdminPunishmentView {
  id: string;
  title: string;
  description: string;
  status: PunishmentStatus;
  createdAt: string;
  riddleTitle: string;
  riddleNumber: number;
  media: ManagedMedia[];
  proofs: AdminProofView[];
}

const STATUS_BADGE: Record<
  PunishmentStatus,
  { label: string; variant: "warning" | "gold" | "destructive" | "success" }
> = {
  assigned: { label: "Waiting for proof", variant: "warning" },
  proof_submitted: { label: "Proof to review", variant: "gold" },
  proof_rejected: { label: "Proof rejected — retrying", variant: "destructive" },
  completed: { label: "Completed", variant: "success" },
};

export function PunishmentsBoard({
  punishments,
}: {
  punishments: AdminPunishmentView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [reviewDialog, setReviewDialog] = useState<{
    proof: AdminProofView;
    approve: boolean;
  } | null>(null);
  const [editDialog, setEditDialog] = useState<AdminPunishmentView | null>(null);
  const [feedback, setFeedback] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const submitReview = () => {
    if (!reviewDialog) return;
    startTransition(async () => {
      const result = await reviewProof({
        proofId: reviewDialog.proof.id,
        approve: reviewDialog.approve,
        feedback: feedback.trim() || undefined,
      });
      if (result.ok) {
        toast(
          reviewDialog.approve
            ? "Proof approved — her retry is unlocked ❤️"
            : "Proof rejected — she'll try again 🙈",
        );
        setReviewDialog(null);
        setFeedback("");
        router.refresh();
      } else toast.error(result.error);
    });
  };

  const saveEdit = () => {
    if (!editDialog) return;
    startTransition(async () => {
      const result = await updatePunishment({
        id: editDialog.id,
        title: editTitle,
        description: editDescription,
      });
      if (result.ok) {
        toast("Forfeit updated");
        setEditDialog(null);
        router.refresh();
      } else toast.error(result.error);
    });
  };

  const remove = (p: AdminPunishmentView) => {
    if (
      !window.confirm(
        `Delete forfeit "${p.title}"? If it was blocking her, her retry unlocks immediately.`,
      )
    )
      return;
    startTransition(async () => {
      const result = await deletePunishment(p.id);
      if (result.ok) {
        toast("Forfeit deleted");
        router.refresh();
      } else toast.error(result.error);
    });
  };

  const toReview = punishments.filter((p) =>
    p.proofs.some((pr) => pr.status === "pending"),
  );
  const others = punishments.filter(
    (p) => !p.proofs.some((pr) => pr.status === "pending"),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-500">
          The royal court
        </p>
        <h1 className="mt-1 font-serif text-4xl">Forfeits</h1>
      </header>

      {punishments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <Theater className="h-8 w-8 text-rose-400" />
            <p className="text-sm text-muted-foreground">
              No forfeits yet. When you reject an answer, decree one from the
              Reviews page.
            </p>
          </CardContent>
        </Card>
      )}

      {[...toReview, ...others].map((p) => (
        <Card key={p.id} className={toReview.includes(p) ? "luxe-ring" : ""}>
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  Riddle {p.riddleNumber} — {p.riddleTitle} ·{" "}
                  {formatDateTime(p.createdAt)}
                </p>
                <h2 className="mt-1 flex items-center gap-2 font-serif text-2xl">
                  <Crown className="h-5 w-5 text-gold-500" /> {p.title}
                </h2>
                <p className="mt-1.5 whitespace-pre-line text-sm text-foreground/80">
                  {p.description}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant={STATUS_BADGE[p.status].variant}>
                  {STATUS_BADGE[p.status].label}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Edit forfeit"
                  onClick={() => {
                    setEditTitle(p.title);
                    setEditDescription(p.description);
                    setEditDialog(p);
                  }}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete forfeit"
                  className="text-destructive"
                  disabled={pending}
                  onClick={() => remove(p)}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>

            {/* Punishment brief media */}
            <details className="rounded-2xl border border-border/50 p-4">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                Attached media ({p.media.length})
              </summary>
              <div className="mt-3">
                <MediaManager
                  context="punishment"
                  refId={p.id}
                  folder={`punishments/${p.id}`}
                  items={p.media}
                  emptyLabel="Attach an optional image or video to the forfeit brief."
                />
              </div>
            </details>

            {/* Proofs */}
            {p.proofs.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold">Her proofs</p>
                {p.proofs.map((proof) => (
                  <div
                    key={proof.id}
                    className="rounded-2xl border border-border/60 bg-background/50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {proof.proofType.toUpperCase()} proof ·{" "}
                        {formatDateTime(proof.createdAt)}
                      </p>
                      {proof.status === "pending" ? (
                        <Badge variant="warning">
                          <Hourglass className="h-3 w-3" /> Awaiting verdict
                        </Badge>
                      ) : proof.status === "approved" ? (
                        <Badge variant="success">
                          <Check className="h-3 w-3" /> Approved
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <X className="h-3 w-3" /> Rejected
                        </Badge>
                      )}
                    </div>

                    {proof.contentText && (
                      <p className="mt-3 whitespace-pre-line font-serif text-lg">
                        “{proof.contentText}”
                      </p>
                    )}
                    {proof.mediaUrl &&
                      (proof.proofType === "video" ? (
                        // eslint-disable-next-line jsx-a11y/media-has-caption
                        <video
                          src={proof.mediaUrl}
                          controls
                          playsInline
                          className="mt-3 max-h-80 w-full rounded-2xl object-contain"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={proof.mediaUrl}
                          alt="Punishment proof"
                          className="mt-3 max-h-80 rounded-2xl object-contain"
                        />
                      ))}

                    {proof.status === "pending" && (
                      <div className="mt-4 flex gap-3">
                        <Button
                          className="flex-1"
                          onClick={() => {
                            setFeedback("");
                            setReviewDialog({ proof, approve: true });
                          }}
                        >
                          <ThumbsUp /> Approve
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => {
                            setFeedback("");
                            setReviewDialog({ proof, approve: false });
                          }}
                        >
                          <ThumbsDown /> Reject
                        </Button>
                      </div>
                    )}
                    {proof.adminFeedback && proof.status !== "pending" && (
                      <p className="mt-2 text-xs italic text-muted-foreground">
                        Your note: “{proof.adminFeedback}”
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Proof review dialog */}
      <Dialog
        open={!!reviewDialog}
        onOpenChange={(open) => !open && setReviewDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog?.approve ? "Approve this proof?" : "Reject this proof?"}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog?.approve
                ? "Her Retry Answer button unlocks the moment you approve."
                : "She'll have to submit a new proof before retrying."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Feedback (optional)</Label>
            <Textarea
              rows={2}
              value={feedback}
              placeholder={
                reviewDialog?.approve
                  ? "You were adorable. Forgiven. ❤️"
                  : "I need to actually hear you sing, my love…"
              }
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant={reviewDialog?.approve ? "default" : "destructive"}
              onClick={submitReview}
              disabled={pending}
            >
              {pending && <Loader2 className="animate-spin" />}
              {reviewDialog?.approve ? "Approve proof" : "Reject proof"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit punishment dialog */}
      <Dialog
        open={!!editDialog}
        onOpenChange={(open) => !open && setEditDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit forfeit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={saveEdit}
              disabled={pending || !editTitle.trim() || !editDescription.trim()}
            >
              {pending && <Loader2 className="animate-spin" />} Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
