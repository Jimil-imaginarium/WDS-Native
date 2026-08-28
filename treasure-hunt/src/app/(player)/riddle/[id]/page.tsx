"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Loader2, Send, Drama } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Countdown } from "@/components/game/countdown";
import { TreasureChest } from "@/components/game/treasure-chest";
import { fireConfetti, fireHearts } from "@/components/effects/celebrations";
import {
  useMap,
  useMyAnswers,
  useMySubmissions,
  useRiddle,
  useSubmitAnswer,
} from "@/hooks/use-game-data";
import { getRiddleState } from "@/lib/game";
import { useUiStore } from "@/stores/ui-store";
import type { RiddleState } from "@/lib/types";

export default function RiddlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: map, refetch: refetchMap } = useMap();
  const { data: riddle, isLoading, refetch: refetchRiddle } = useRiddle(id);
  const { data: answers = [] } = useMyAnswers();
  const { data: submissions = [] } = useMySubmissions();
  const submitAnswer = useSubmitAnswer();
  const [answerText, setAnswerText] = useState("");
  const { celebratedRiddles, markCelebrated } = useUiStore();

  const node = map?.find((n) => n.riddle_id === id);
  const riddleAnswers = useMemo(
    () => answers.filter((a) => a.riddle_id === id),
    [answers, id]
  );
  const riddleSubmissions = useMemo(
    () =>
      submissions.filter((s) => riddleAnswers.some((a) => a.id === s.answer_id)),
    [submissions, riddleAnswers]
  );

  const state: RiddleState = getRiddleState({
    unlocked: node ? node.unlocked : !!riddle,
    answers: riddleAnswers,
    submissions: riddleSubmissions,
  });

  // celebrate an approval exactly once per session
  useEffect(() => {
    if (state === "completed" && !celebratedRiddles.includes(id)) {
      markCelebrated(id);
      fireConfetti();
      setTimeout(fireHearts, 400);
    }
  }, [state, id, celebratedRiddles, markCelebrated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerText.trim()) return;
    try {
      await submitAnswer.mutateAsync({ riddleId: id, answerText: answerText.trim() });
      setAnswerText("");
      toast("💌 Answer sent!", {
        description: "Waiting for the Treasure Keeper to review it…",
      });
    } catch {
      toast.error("Couldn't submit that answer", {
        description: "The chest resisted… try again in a moment.",
      });
    }
  };

  // ── Locked ────────────────────────────────────────────────────────
  if (!isLoading && !riddle && node && !node.unlocked) {
    return (
      <div className="mx-auto max-w-2xl">
        <BackLink />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass flex flex-col items-center gap-8 rounded-3xl p-10 text-center"
        >
          <TreasureChest variant="locked" size={140} />
          <div>
            <h1 className="font-display text-4xl">🔒 Locked</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This chest is sealed until its moment arrives. It will open all
              by itself — magic needs no refresh button.
            </p>
          </div>
          <Countdown
            targetIso={node.unlock_at}
            label="Opens in"
            onComplete={() => {
              refetchMap();
              refetchRiddle();
            }}
          />
        </motion.div>
      </div>
    );
  }

  if (isLoading || !riddle) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <BackLink />
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-32 w-full rounded-3xl" />
      </div>
    );
  }

  // ── Unlocked riddle ───────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-2xl">
      <BackLink />

      <motion.article
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-8"
      >
        {/* title + story */}
        <header className="text-center">
          <p className="mb-2 text-xs uppercase tracking-[0.35em] text-pink-300/80">
            {node ? `Day ${node.day_number} • Riddle ${node.riddle_number}` : "Riddle"}
          </p>
          <h1 className="font-display text-4xl leading-tight text-romantic sm:text-5xl">
            {riddle.title}
          </h1>
        </header>

        <div className="flex justify-center">
          <TreasureChest
            variant={state === "completed" ? "completed" : "unlocked"}
            size={150}
          />
        </div>

        {riddle.story && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mx-auto max-w-lg text-center font-display text-lg italic leading-relaxed text-foreground/85"
          >
            {riddle.story}
          </motion.p>
        )}

        {riddle.image_url && (
          <div className="flex justify-center">
            <Image
              src={riddle.image_url}
              alt="A clue…"
              width={480}
              height={320}
              className="max-h-80 w-auto rounded-2xl border border-white/10 object-cover shadow-2xl"
            />
          </div>
        )}

        {/* question + state-dependent body */}
        <Card className="border-pink-400/25">
          <CardContent className="p-6 sm:p-8">
            <p className="mb-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              The question
            </p>
            <p className="font-display text-xl leading-relaxed sm:text-2xl">
              {riddle.question}
            </p>

            <div className="mt-6">
              <AnimatePresence mode="wait">
                {state === "available" && (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-3 sm:flex-row"
                  >
                    <Input
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      placeholder="Whisper your answer…"
                      className="h-12 flex-1 text-base"
                      maxLength={500}
                      autoFocus
                    />
                    <Button
                      type="submit"
                      size="lg"
                      disabled={submitAnswer.isPending || !answerText.trim()}
                    >
                      {submitAnswer.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Submit
                    </Button>
                  </motion.form>
                )}

                {state === "answer_pending" && (
                  <motion.div
                    key="pending"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-5 text-center"
                  >
                    <motion.p
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="font-display text-lg text-amber-200"
                    >
                      ⏳ Pending approval…
                    </motion.p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your answer is with the Treasure Keeper. You'll know the
                      moment it's reviewed — no refresh needed.
                    </p>
                    {riddleAnswers[0] && (
                      <p className="mt-3 text-xs text-muted-foreground/70">
                        You answered: “{riddleAnswers[0].answer_text}”
                      </p>
                    )}
                  </motion.div>
                )}

                {(state === "punishment_required" ||
                  state === "punishment_pending") && (
                  <motion.div
                    key="punishment"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-5 text-center"
                  >
                    <p className="font-display text-lg text-rose-300">
                      ❌ Wrong answer!
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {state === "punishment_required"
                        ? "Before trying again, you must complete a punishment…"
                        : "Your punishment proof is being judged…"}
                    </p>
                    <Button asChild variant="destructive" className="mt-4">
                      <Link href={`/punishment/${id}`}>
                        <Drama className="h-4 w-4" />
                        {state === "punishment_required"
                          ? "Face your punishment"
                          : "View punishment status"}
                      </Link>
                    </Button>
                  </motion.div>
                )}

                {state === "completed" && (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-5 text-center"
                  >
                    <p className="font-display text-2xl text-emerald-300">
                      ✨ Correct!
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Another piece of the map is yours. The next chest opens
                      at its appointed hour…
                    </p>
                    <Button asChild variant="gold" className="mt-4">
                      <Link href="/hunt">Back to the map</Link>
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        {/* attempt history */}
        {riddleAnswers.length > 0 && state !== "completed" && (
          <div className="text-center text-xs text-muted-foreground/70">
            Attempts so far: {riddleAnswers.length}
          </div>
        )}
      </motion.article>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/hunt"
      className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Back to the map
    </Link>
  );
}
