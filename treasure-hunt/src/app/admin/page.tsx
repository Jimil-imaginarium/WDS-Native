"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  Drama,
  Hourglass,
  LockOpen,
  MessageCircleQuestion,
  Trophy,
  User,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ReviewAnswers } from "@/components/admin/review-answers";
import { ReviewProofs } from "@/components/admin/review-proofs";
import { AdminTimeline } from "@/components/admin/timeline";
import { useAdminData } from "@/hooks/use-admin-data";

export default function AdminDashboard() {
  const { data, isLoading } = useAdminData();

  const stats = useMemo(() => {
    if (!data) return null;
    const now = Date.now();
    const unlocked = data.schedule.filter(
      (s) => new Date(s.unlock_at).getTime() <= now
    ).length;
    const pendingAnswers = data.answers.filter((a) => a.status === "pending");
    const pendingProofs = data.submissions.filter((s) => s.status === "pending");
    const completedProofs = data.submissions.filter(
      (s) => s.status === "approved"
    ).length;
    const completedRiddles = data.progress.filter(
      (p) => p.status === "completed"
    ).length;

    // current day = highest day with at least one unlocked riddle
    const unlockedIds = new Set(
      data.schedule
        .filter((s) => new Date(s.unlock_at).getTime() <= now)
        .map((s) => s.riddle_id)
    );
    const currentDay = data.days.reduce((acc, day) => {
      const dayUnlocked = data.riddles.some(
        (r) => r.day_id === day.id && unlockedIds.has(r.id)
      );
      return dayUnlocked ? Math.max(acc, day.day_number) : acc;
    }, 0);

    const totalRiddles = data.riddles.length;
    const player = data.players.find((p) => p.role === "player");

    return {
      currentDay,
      totalDays: data.days.length,
      unlocked,
      totalRiddles,
      pendingAnswers,
      pendingProofs,
      completedProofs,
      completedRiddles,
      player,
      percent:
        totalRiddles === 0
          ? 0
          : Math.round((completedRiddles / totalRiddles) * 100),
    };
  }, [data]);

  if (isLoading || !stats || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      label: "Current day",
      value: stats.currentDay > 0 ? `${stats.currentDay} / ${stats.totalDays}` : "Not started",
      icon: CalendarDays,
      tint: "text-sky-300",
    },
    {
      label: "Unlocked riddles",
      value: `${stats.unlocked} / ${stats.totalRiddles}`,
      icon: LockOpen,
      tint: "text-amber-300",
    },
    {
      label: "Pending answers",
      value: String(stats.pendingAnswers.length),
      icon: MessageCircleQuestion,
      tint: "text-pink-300",
      pulse: stats.pendingAnswers.length > 0,
    },
    {
      label: "Pending punishments",
      value: String(stats.pendingProofs.length),
      icon: Hourglass,
      tint: "text-rose-300",
      pulse: stats.pendingProofs.length > 0,
    },
    {
      label: "Completed punishments",
      value: String(stats.completedProofs),
      icon: Drama,
      tint: "text-violet-300",
    },
    {
      label: "Completed riddles",
      value: `${stats.completedRiddles} / ${stats.totalRiddles}`,
      icon: CheckCircle2,
      tint: "text-emerald-300",
    },
    {
      label: "Player",
      value: stats.player?.display_name ?? "—",
      icon: User,
      tint: "text-fuchsia-300",
    },
    {
      label: "Hunt progress",
      value: `${stats.percent}%`,
      icon: Trophy,
      tint: "text-yellow-300",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-treasure">
          Treasure Keeper's Deck
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything about the hunt, live. Approvals land here the second she
          submits.
        </p>
      </div>

      {/* stats grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className={card.pulse ? "border-pink-400/50 animate-pulse-glow" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <card.icon className={`h-4 w-4 ${card.tint}`} />
                </div>
                <p className="mt-2 truncate font-display text-2xl">{card.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* player progress bar */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {stats.player?.display_name ?? "Player"}'s journey to the treasure
            </span>
            <span className="font-display text-treasure">
              {stats.completedRiddles} / {stats.totalRiddles}
            </span>
          </div>
          <Progress value={stats.percent} />
        </CardContent>
      </Card>

      {/* review queues + timeline */}
      <Tabs defaultValue="answers">
        <TabsList>
          <TabsTrigger value="answers">
            Answers
            {stats.pendingAnswers.length > 0 && (
              <Badge variant="pending">{stats.pendingAnswers.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="punishments">
            Punishments
            {stats.pendingProofs.length > 0 && (
              <Badge variant="pending">{stats.pendingProofs.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="answers" className="mt-4">
          <ReviewAnswers data={data} />
        </TabsContent>
        <TabsContent value="punishments" className="mt-4">
          <ReviewProofs data={data} />
        </TabsContent>
        <TabsContent value="timeline" className="mt-4">
          <AdminTimeline data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
