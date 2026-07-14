"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Flame,
  Lock,
  MapPin,
  Sparkles,
} from "lucide-react";
import { CountdownTimer } from "@/components/countdown-timer";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeartDivider } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { notifyRiddleUnlocked } from "@/server/actions/player";
import {
  allCompleted,
  completedCount,
  currentEntry,
  dailyStreak,
  groupBoardByDay,
  nextUnlock,
} from "@/lib/game";
import { STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { BoardEntry } from "@/lib/database.types";
import { cn } from "@/lib/utils";

interface PlayerDashboardProps {
  board: BoardEntry[];
  displayName: string;
  welcomeMessage?: string | null;
  badgeCount: number;
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

export function PlayerDashboard({
  board,
  displayName,
  welcomeMessage,
  badgeCount,
}: PlayerDashboardProps) {
  const router = useRouter();
  const days = groupBoardByDay(board);
  const current = currentEntry(board);
  const done = completedCount(board);
  const total = board.length;
  const waiting = nextUnlock(board);
  const finished = allCompleted(board);
  const streak = dailyStreak(board);

  const currentDay = current
    ? days.find((d) => d.dayId === current.day_id)
    : days[days.length - 1];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-3xl space-y-10"
    >
      {/* Personalized welcome */}
      <motion.section variants={itemVariants} className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-500">
          Welcome back
        </p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl">
          {displayName}
          <span className="text-rose-400"> ❤</span>
        </h1>
        <p className="mx-auto mt-3 max-w-lg font-serif text-lg italic text-muted-foreground">
          {welcomeMessage ??
            "Every riddle you solve brings you one step closer to the treasure — and to me."}
        </p>
      </motion.section>

      {/* Overall progress */}
      <motion.section variants={itemVariants}>
        <Card>
          <CardContent className="p-6 sm:p-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
                  Overall progress
                </p>
                <p className="mt-1 font-serif text-3xl">
                  {done}
                  <span className="text-muted-foreground"> / {total || 12}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {streak > 0 && (
                  <Badge variant="warning">
                    <Flame className="h-3 w-3" /> {streak}-day streak
                  </Badge>
                )}
                <Link href="/hunt/achievements">
                  <Badge variant="gold">
                    <Award className="h-3 w-3" /> {badgeCount} badges
                  </Badge>
                </Link>
              </div>
            </div>
            <Progress value={total ? (done / total) * 100 : 0} />
            {currentDay && current && (
              <p className="mt-4 text-sm text-muted-foreground">
                Day {currentDay.dayNumber} · Riddle{" "}
                {current.riddle_number} of {currentDay.riddles.length}
              </p>
            )}
          </CardContent>
        </Card>
      </motion.section>

      {/* Countdown or current riddle CTA */}
      {finished ? (
        <motion.section variants={itemVariants}>
          <Card className="luxe-ring overflow-hidden">
            <CardContent className="flex flex-col items-center gap-5 p-10 text-center">
              <Sparkles className="h-10 w-10 text-gold-500" />
              <h2 className="font-serif text-3xl">
                Every riddle is solved, my love.
              </h2>
              <p className="max-w-md text-muted-foreground">
                The final treasure is waiting for you.
              </p>
              <Button size="lg" variant="gold" onClick={() => router.push("/hunt/treasure")}>
                Open the treasure <ChevronRight />
              </Button>
            </CardContent>
          </Card>
        </motion.section>
      ) : waiting ? (
        <motion.section variants={itemVariants}>
          <Card className="overflow-hidden">
            <CardContent className="p-8 sm:p-12">
              <CountdownTimer
                targetIso={waiting.unlock_at}
                onFinish={() => {
                  notifyRiddleUnlocked(waiting.riddle_id);
                  router.refresh();
                }}
              />
              <p className="mt-6 text-center text-sm text-muted-foreground">
                “{waiting.title}” — Day {waiting.day_number}, Riddle{" "}
                {waiting.riddle_number}
              </p>
            </CardContent>
          </Card>
        </motion.section>
      ) : current ? (
        <motion.section variants={itemVariants}>
          <Link href={`/hunt/riddle/${current.riddle_id}`}>
            <Card className="luxe-ring group cursor-pointer overflow-hidden transition hover:shadow-luxe-lg">
              <CardContent className="flex items-center justify-between gap-4 p-7 sm:p-9">
                <div>
                  <Badge className="mb-3">
                    <MapPin className="h-3 w-3" /> Your current riddle
                  </Badge>
                  <h2 className="font-serif text-3xl sm:text-4xl">{current.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Day {current.day_number} · Riddle {current.riddle_number} ·{" "}
                    {STATUS_LABELS[current.status]}
                  </p>
                </div>
                <ChevronRight className="h-8 w-8 shrink-0 text-rose-400 transition group-hover:translate-x-1.5" />
              </CardContent>
            </Card>
          </Link>
        </motion.section>
      ) : (
        <motion.section variants={itemVariants}>
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              The hunt hasn&apos;t been written yet — check back soon, my love.
            </CardContent>
          </Card>
        </motion.section>
      )}

      <HeartDivider />

      {/* Chapters */}
      <div className="space-y-8">
        {days.map((day) => (
          <motion.section key={day.dayId} variants={itemVariants}>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-500">
                  Day {day.dayNumber} · {formatDate(day.date)}
                </p>
                <h3 className="mt-1 font-serif text-2xl sm:text-3xl">{day.title}</h3>
                {day.subtitle && (
                  <p className="mt-0.5 text-sm italic text-muted-foreground">
                    {day.subtitle}
                  </p>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {day.completedCount}/{day.riddles.length}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {day.riddles.map((riddle) => (
                <RiddleCard
                  key={riddle.riddle_id}
                  riddle={riddle}
                  isCurrent={current?.riddle_id === riddle.riddle_id}
                />
              ))}
            </div>
          </motion.section>
        ))}
      </div>
    </motion.div>
  );
}

function RiddleCard({
  riddle,
  isCurrent,
}: {
  riddle: BoardEntry;
  isCurrent: boolean;
}) {
  const completed = riddle.status === "completed";
  const accessible = riddle.is_unlocked && !completed;
  const locked = !riddle.is_unlocked && !completed;

  const inner = (
    <Card
      className={cn(
        "h-full transition",
        completed && "border-emerald-300/40 bg-emerald-50/40 dark:bg-emerald-950/20",
        isCurrent && accessible && "luxe-ring hover:shadow-luxe-lg",
        locked && "opacity-60",
      )}
    >
      <CardContent className="flex h-full flex-col gap-2 p-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Riddle {riddle.riddle_number}
          </span>
          {completed ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : locked ? (
            <Lock className="h-4 w-4 text-muted-foreground" />
          ) : (
            <span className="h-2.5 w-2.5 animate-pulse-soft rounded-full bg-rose-500" />
          )}
        </div>
        <p className="font-serif text-lg leading-snug">
          {locked ? "A secret for later…" : riddle.title}
        </p>
        <p className="mt-auto text-xs text-muted-foreground">
          {completed
            ? "Completed"
            : locked
              ? `Unlocks ${new Date(riddle.unlock_at).toLocaleString(undefined, {
                  weekday: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}`
              : STATUS_LABELS[riddle.status]}
        </p>
      </CardContent>
    </Card>
  );

  return accessible || completed ? (
    <Link href={`/hunt/riddle/${riddle.riddle_id}`}>{inner}</Link>
  ) : (
    inner
  );
}
