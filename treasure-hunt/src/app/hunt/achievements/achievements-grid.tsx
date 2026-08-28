"use client";

import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AchievementItem {
  code: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string | null;
}

/** Cute badge wall — earned badges glow, locked ones wait in shadow. */
export function AchievementsGrid({ items }: { items: AchievementItem[] }) {
  const unlockedCount = items.filter((i) => i.unlockedAt).length;

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-500">
          Your trophy shelf
        </p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Badges</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {unlockedCount} of {items.length} unlocked
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((a, i) => {
          const unlocked = !!a.unlockedAt;
          return (
            <motion.div
              key={a.code}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
              className={`glass relative flex flex-col items-center gap-2 rounded-3xl p-6 text-center transition ${
                unlocked ? "luxe-ring" : "opacity-55 grayscale"
              }`}
            >
              <motion.span
                animate={unlocked ? { y: [0, -4, 0] } : undefined}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="text-4xl"
              >
                {unlocked ? a.icon : <Lock className="h-8 w-8 text-muted-foreground" />}
              </motion.span>
              <h3 className="font-serif text-lg leading-tight">{a.title}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {a.description}
              </p>
              {a.unlockedAt && (
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-gold-500">
                  {formatDate(a.unlockedAt)}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
