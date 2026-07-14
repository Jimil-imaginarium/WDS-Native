"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Crown,
  Hourglass,
  Lightbulb,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { HeartDivider } from "@/components/ui/separator";
import { MediaGallery, type GalleryItem } from "@/components/media-gallery";
import { MusicToggle } from "@/components/music-toggle";
import { Celebration } from "@/components/celebration";
import { CountdownTimer } from "@/components/countdown-timer";
import { ProofUploader } from "./proof-uploader";
import { submitAnswer, notifyRiddleUnlocked } from "@/server/actions/player";
import type {
  AnswerSubmission,
  ProofStatus,
  ProofType,
  PunishmentStatus,
  RiddleContent,
  RiddleStatus,
} from "@/lib/database.types";

export interface ProofView {
  id: string;
  proofType: ProofType;
  contentText: string | null;
  mediaUrl: string | null;
  status: ProofStatus;
  adminFeedback: string | null;
  createdAt: string;
}

export interface PunishmentView {
  id: string;
  title: string;
  description: string;
  status: PunishmentStatus;
  media: GalleryItem[];
  proofs: ProofView[];
}

interface RiddleExperienceProps {
  content: RiddleContent;
  status: RiddleStatus;
  attempts: number;
  latestSubmission: AnswerSubmission | null;
  punishment: PunishmentView | null;
  gallery: GalleryItem[];
  musicUrl: string | null;
  playerId: string;
  nextRiddle: { id: string; title: string; unlockAt: string } | null;
  totalDone: number;
  totalCount: number;
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export function RiddleExperience({
  content,
  status,
  latestSubmission,
  punishment,
  gallery,
  musicUrl,
  nextRiddle,
  totalDone,
  totalCount,
}: RiddleExperienceProps) {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [pending, startTransition] = useTransition();
  const [showHint, setShowHint] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const prevStatus = useRef(status);

  // Celebrate the moment the admin's approval arrives (via realtime refresh).
  useEffect(() => {
    if (prevStatus.current !== "completed" && status === "completed") {
      setCelebrate(true);
    }
    prevStatus.current = status;
  }, [status]);

  const canAnswer = status === "not_started" || status === "retry_unlocked";
  const isTreasureNext = totalCount > 0 && totalDone === totalCount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    startTransition(async () => {
      const result = await submitAnswer({ riddleId: content.id, answer });
      if (result.ok) {
        toast("Your answer is on its way 💌", {
          description: "It now rests with the keeper of the treasure.",
        });
        setAnswer("");
        router.refresh();
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  };

  const nextIsLocked =
    nextRiddle && new Date(nextRiddle.unlockAt).getTime() > Date.now();

  return (
    <div className="mx-auto max-w-2xl">
      <Celebration
        open={celebrate}
        title={content.title}
        onClose={() => setCelebrate(false)}
        ctaLabel={
          isTreasureNext
            ? "To the treasure…"
            : nextRiddle
              ? "Continue our story"
              : "Back to the map"
        }
      />

      {/* Top bar */}
      <motion.div {...fadeUp} className="mb-8 flex items-center justify-between">
        <Link
          href="/hunt"
          className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> The map
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            Day {content.day_number} · Riddle {content.riddle_number}
          </Badge>
          <MusicToggle src={musicUrl} />
        </div>
      </motion.div>

      {/* Title */}
      <motion.header
        {...fadeUp}
        transition={{ delay: 0.1 }}
        className="mb-10 text-center"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-500">
          {content.day_title}
        </p>
        <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">
          {content.title}
        </h1>
      </motion.header>

      {/* Story */}
      {content.story && (
        <motion.section
          {...fadeUp}
          transition={{ delay: 0.2 }}
          className="mb-10"
        >
          <div className="glass rounded-3xl p-7 sm:p-9">
            <p className="whitespace-pre-line font-serif text-lg leading-relaxed text-foreground/90 first-letter:float-left first-letter:mr-2 first-letter:font-serif first-letter:text-6xl first-letter:leading-[0.85] first-letter:text-rose-500">
              {content.story}
            </p>
          </div>
        </motion.section>
      )}

      {/* Media */}
      {gallery.length > 0 && (
        <motion.section {...fadeUp} transition={{ delay: 0.28 }} className="mb-10">
          <MediaGallery items={gallery} />
        </motion.section>
      )}

      <HeartDivider className="mb-10" />

      {/* Question */}
      <motion.section {...fadeUp} transition={{ delay: 0.34 }} className="mb-8">
        <Card className="luxe-ring">
          <CardContent className="p-7 sm:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-400">
              The question
            </p>
            <p className="mt-3 font-serif text-2xl leading-snug">
              {content.question || "…"}
            </p>

            {content.hint && (
              <div className="mt-5">
                {showHint ? (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="flex items-start gap-2 rounded-2xl bg-gold-100/60 p-4 text-sm text-gold-800 dark:bg-gold-900/25 dark:text-gold-200"
                  >
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                    {content.hint}
                  </motion.p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowHint(true)}
                    className="flex items-center gap-1.5 text-sm font-medium text-gold-600 hover:underline"
                  >
                    <Lightbulb className="h-4 w-4" /> Whisper me a hint…
                  </button>
                )}
              </div>
            )}

            {/* Answer form */}
            <form onSubmit={handleSubmit} className="mt-7 space-y-3">
              {status === "retry_unlocked" && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
                >
                  <RotateCcw className="h-4 w-4" /> Forfeit forgiven — you may
                  answer again.
                </motion.p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={
                    canAnswer
                      ? "Whisper your answer…"
                      : "The answer box sleeps for now…"
                  }
                  disabled={!canAnswer || pending}
                  className="h-12 flex-1 text-base"
                  maxLength={2000}
                />
                <Button
                  type="submit"
                  size="lg"
                  disabled={!canAnswer || pending || !answer.trim()}
                >
                  {pending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.section>

      {/* Status panels */}
      <AnimatePresence mode="wait">
        {status === "answer_pending" && latestSubmission && (
          <StatusPanel
            key="pending"
            icon={<Hourglass className="h-6 w-6 animate-pulse-soft text-gold-500" />}
            title="Pending admin review"
            tone="gold"
          >
            Your answer — <em>“{latestSubmission.answer_text}”</em> — now rests
            with the keeper of the treasure. You&apos;ll know the moment he
            decides…
          </StatusPanel>
        )}

        {status === "answer_rejected" && (
          <StatusPanel
            key="rejected"
            icon={<Crown className="h-6 w-6 text-rose-500" />}
            title="Not quite, my love…"
            tone="rose"
          >
            {latestSubmission?.admin_feedback ??
              "That wasn't the answer I hid. A forfeit is being prepared for you — watch this space."}
          </StatusPanel>
        )}

        {(status === "punishment_assigned" || status === "proof_submitted") &&
          punishment && (
            <motion.section
              key="punishment"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8"
            >
              <PunishmentCard punishment={punishment} />
            </motion.section>
          )}

        {status === "completed" && (
          <StatusPanel
            key="completed"
            icon={<CheckCircle2 className="h-6 w-6 text-emerald-500" />}
            title="Riddle completed"
            tone="emerald"
          >
            <span className="block">
              {latestSubmission?.admin_feedback ?? "Beautifully solved."}
            </span>
            {isTreasureNext ? (
              <Link href="/hunt/treasure" className="mt-4 inline-block">
                <Button variant="gold" size="lg">
                  <Sparkles className="h-4 w-4" /> Open the final treasure
                </Button>
              </Link>
            ) : nextRiddle && !nextIsLocked ? (
              <Link href={`/hunt/riddle/${nextRiddle.id}`} className="mt-4 inline-block">
                <Button size="lg">
                  Next riddle <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : nextRiddle ? (
              <div className="mt-6">
                <CountdownTimer
                  targetIso={nextRiddle.unlockAt}
                  title="Next riddle unlocks in"
                  onFinish={() => {
                    notifyRiddleUnlocked(nextRiddle.id);
                    router.refresh();
                  }}
                />
              </div>
            ) : null}
          </StatusPanel>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusPanel({
  icon,
  title,
  tone,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone: "gold" | "rose" | "emerald";
  children: React.ReactNode;
}) {
  const tones = {
    gold: "border-gold-300/40 bg-gold-100/40 dark:bg-gold-900/15",
    rose: "border-rose-300/40 bg-rose-100/40 dark:bg-rose-950/25",
    emerald: "border-emerald-300/40 bg-emerald-50/50 dark:bg-emerald-950/20",
  } as const;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`mb-8 rounded-3xl border p-7 backdrop-blur-xl sm:p-8 ${tones[tone]}`}
    >
      <div className="flex items-start gap-4">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div>
          <h3 className="font-serif text-2xl">{title}</h3>
          <div className="mt-2 text-sm leading-relaxed text-foreground/80">
            {children}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function PunishmentCard({ punishment }: { punishment: PunishmentView }) {
  const pendingProof = punishment.proofs.find((p) => p.status === "pending");
  const rejectedProof = punishment.proofs.find((p) => p.status === "rejected");

  return (
    <Card className="overflow-hidden border-rose-300/50">
      <div className="bg-gradient-to-r from-rose-500 to-rose-400 px-7 py-4 text-white">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em]">
          <Crown className="h-4 w-4" /> Royal forfeit
        </p>
      </div>
      <CardContent className="space-y-5 p-7 sm:p-8">
        <div>
          <h3 className="font-serif text-3xl">{punishment.title}</h3>
          <p className="mt-2 whitespace-pre-line leading-relaxed text-foreground/85">
            {punishment.description}
          </p>
        </div>

        {punishment.media.length > 0 && <MediaGallery items={punishment.media} />}

        {punishment.status === "proof_submitted" && pendingProof ? (
          <div className="rounded-2xl bg-gold-100/50 p-5 text-sm text-gold-800 dark:bg-gold-900/25 dark:text-gold-200">
            <p className="flex items-center gap-2 font-medium">
              <Hourglass className="h-4 w-4 animate-pulse-soft" /> Waiting for
              approval
            </p>
            <p className="mt-1.5">
              Your proof has been delivered to the court. The verdict is
              coming…
            </p>
          </div>
        ) : (
          <>
            {rejectedProof && punishment.status === "proof_rejected" && (
              <div className="rounded-2xl bg-destructive/10 p-5 text-sm">
                <p className="font-medium text-destructive">
                  Your last proof was declined
                </p>
                {rejectedProof.adminFeedback && (
                  <p className="mt-1.5 text-foreground/75">
                    “{rejectedProof.adminFeedback}”
                  </p>
                )}
              </div>
            )}
            <ProofUploader punishmentId={punishment.id} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
