"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import type { AdminData } from "@/hooks/use-admin-data";
import { formatDateTime } from "@/lib/utils";

interface TimelineEvent {
  id: string;
  at: string;
  icon: string;
  text: string;
}

/** Chronological feed of everything that has happened in the hunt. */
export function AdminTimeline({ data }: { data: AdminData }) {
  const riddleById = new Map(data.riddles.map((r) => [r.id, r]));
  const punishmentById = new Map(data.punishments.map((p) => [p.id, p]));

  const events: TimelineEvent[] = [];

  for (const a of data.answers) {
    const riddle = riddleById.get(a.riddle_id);
    events.push({
      id: `a-${a.id}`,
      at: a.submitted_at,
      icon: "💌",
      text: `Answer submitted for “${riddle?.title ?? "?"}”: “${a.answer_text}”`,
    });
    if (a.reviewed_at) {
      events.push({
        id: `ar-${a.id}`,
        at: a.reviewed_at,
        icon: a.status === "approved" ? "✨" : "❌",
        text: `Answer ${a.status} for “${riddle?.title ?? "?"}”`,
      });
    }
  }

  for (const s of data.submissions) {
    const punishment = punishmentById.get(s.punishment_id);
    events.push({
      id: `s-${s.id}`,
      at: s.submitted_at,
      icon: "🎭",
      text: `Proof (${s.proof_type}) uploaded for “${punishment?.title ?? "?"}”`,
    });
    if (s.reviewed_at) {
      events.push({
        id: `sr-${s.id}`,
        at: s.reviewed_at,
        icon: s.status === "approved" ? "💖" : "🙈",
        text: `Proof ${s.status} for “${punishment?.title ?? "?"}”`,
      });
    }
  }

  for (const p of data.progress) {
    if (p.completed_at) {
      const riddle = riddleById.get(p.riddle_id);
      events.push({
        id: `p-${p.id}`,
        at: p.completed_at,
        icon: "🏆",
        text: `Riddle completed: “${riddle?.title ?? "?"}” (${p.attempts} attempt${p.attempts === 1 ? "" : "s"})`,
      });
    }
  }

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          The story hasn't started yet… 📜
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="relative space-y-0 pl-6">
          <div className="absolute bottom-2 left-[9px] top-2 w-px bg-border/60" />
          {events.slice(0, 40).map((e, i) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.6) }}
              className="relative py-2.5"
            >
              <span className="absolute -left-6 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-card text-xs ring-1 ring-border">
                {e.icon}
              </span>
              <p className="text-sm">{e.text}</p>
              <p className="text-xs text-muted-foreground/70">
                {formatDateTime(e.at)}
              </p>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
