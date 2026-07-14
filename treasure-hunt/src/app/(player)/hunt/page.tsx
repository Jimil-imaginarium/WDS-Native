"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Countdown } from "@/components/game/countdown";
import { TreasureMap } from "@/components/game/treasure-map";
import { getRiddleState, RIDDLE_STATE_LABEL } from "@/lib/game";
import {
  useGameSettings,
  useMap,
  useMyAnswers,
  useMySubmissions,
} from "@/hooks/use-game-data";
import type { RiddleState } from "@/lib/types";

export default function HuntPage() {
  const { data: settings } = useGameSettings();
  const { data: map, isLoading, refetch } = useMap();
  const { data: answers = [] } = useMyAnswers();
  const { data: submissions = [] } = useMySubmissions();

  const states = useMemo(() => {
    const result: Record<string, RiddleState> = {};
    for (const node of map ?? []) {
      result[node.riddle_id] = getRiddleState({
        unlocked: node.unlocked,
        answers: answers.filter((a) => a.riddle_id === node.riddle_id),
        submissions: submissions.filter((s) =>
          answers.some(
            (a) => a.id === s.answer_id && a.riddle_id === node.riddle_id
          )
        ),
      });
    }
    return result;
  }, [map, answers, submissions]);

  const nodes = map ?? [];
  const total = nodes.length;
  const completed = nodes.filter((n) => states[n.riddle_id] === "completed").length;
  const allDone = total > 0 && completed === total;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  // Current mission: first non-completed riddle in order.
  const current = nodes.find((n) => states[n.riddle_id] !== "completed");
  const currentState: RiddleState | undefined = current
    ? states[current.riddle_id]
    : undefined;

  // Next locked unlock time (for the countdown).
  const nextLocked = nodes.find((n) => !n.unlocked && n.unlock_at);

  const currentDay = current?.day_number ?? nodes[nodes.length - 1]?.day_number ?? 1;

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      {/* header */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <p className="mb-2 text-sm uppercase tracking-[0.3em] text-muted-foreground">
          Day {currentDay} of 4
        </p>
        <h1 className="font-display text-4xl text-romantic sm:text-5xl">
          {settings?.game_title ?? "The Treasure Hunt ❤️"}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          {settings?.welcome_message ?? "A little adventure, made just for you."}
        </p>
      </motion.section>

      {/* progress */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-medium text-muted-foreground">
                Treasure progress
              </span>
              <span className="font-display text-lg text-treasure">
                {completed} / {total || 12}
              </span>
            </div>
            <Progress value={percent} />
            {allDone && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-5 text-center"
              >
                <Button asChild variant="gold" size="lg" className="gap-2">
                  <Link href="/finale">
                    <Trophy className="h-5 w-5" />
                    Claim your treasure
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.section>

      {/* current mission */}
      {!allDone && current && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="overflow-hidden border-pink-400/25">
            <CardContent className="p-6 sm:p-8">
              <p className="mb-1 text-xs uppercase tracking-[0.3em] text-pink-300/80">
                Current mission
              </p>

              {currentState === "locked" ? (
                <div className="flex flex-col items-center gap-5 py-4 text-center">
                  <h2 className="font-display text-2xl">🔒 Locked</h2>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    The next chest is sealed by time itself. It opens
                    automatically — no refresh needed.
                  </p>
                  <Countdown
                    targetIso={current.unlock_at}
                    label="Next riddle unlocks in"
                    onComplete={() => refetch()}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="font-display text-2xl">
                      {current.riddle_title ?? `Riddle ${current.riddle_number}`}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {current.island_name} •{" "}
                      {currentState ? RIDDLE_STATE_LABEL[currentState] : ""}
                    </p>
                  </div>
                  <Button asChild size="lg">
                    <Link href={`/riddle/${current.riddle_id}`}>
                      {currentState === "available"
                        ? "Open the chest"
                        : "View riddle"}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.section>
      )}

      {/* countdown to next locked chest (when current is playable) */}
      {!allDone &&
        nextLocked &&
        current &&
        states[current.riddle_id] !== "locked" && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center"
          >
            <Countdown
              targetIso={nextLocked.unlock_at}
              size="sm"
              label="Next chest unlocks in"
              onComplete={() => refetch()}
            />
          </motion.section>
        )}

      {/* the map */}
      <section>
        <h2 className="mb-6 text-center font-display text-2xl text-treasure">
          🗺️ The Treasure Map
        </h2>
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-3xl" />
            <Skeleton className="h-48 w-full rounded-3xl" />
          </div>
        ) : nodes.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              The map is still being drawn… check back soon! 🖋️
            </CardContent>
          </Card>
        ) : (
          <TreasureMap nodes={nodes} states={states} />
        )}
      </section>
    </div>
  );
}
