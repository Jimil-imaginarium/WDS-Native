"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import { relativeTime } from "@/lib/utils";

const TYPE_EMOJI: Record<string, string> = {
  riddle_unlocked: "✨",
  answer_submitted: "📬",
  answer_approved: "💚",
  answer_rejected: "😏",
  punishment_assigned: "👑",
  proof_uploaded: "🎬",
  punishment_approved: "🎉",
  punishment_rejected: "🙈",
  treasure_found: "🗝️",
  achievement_unlocked: "🏅",
  note_received: "💌",
};

/** Live notification bell with unread badge and dropdown panel. */
export function NotificationBell({ userId }: { userId: string }) {
  const { notifications, unreadCount, markAllRead } = useNotifications(userId);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="glass relative flex h-10 w-10 items-center justify-center rounded-full text-foreground/70 transition hover:shadow-luxe"
      >
        <Bell className="h-4 w-4" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="glass absolute right-0 z-50 mt-3 w-[min(92vw,22rem)] overflow-hidden rounded-3xl"
          >
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-3.5">
              <span className="font-serif text-lg">Whispers</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs font-medium text-rose-500 hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[55vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Nothing yet — the story is just beginning.
                </p>
              ) : (
                notifications.map((n) => {
                  const inner = (
                    <div
                      className={`flex gap-3 px-5 py-3.5 transition hover:bg-accent/60 ${
                        n.read ? "opacity-60" : ""
                      }`}
                    >
                      <span className="text-lg leading-6">
                        {TYPE_EMOJI[n.type] ?? "💫"}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-snug">{n.title}</p>
                        {n.body && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {n.body}
                          </p>
                        )}
                        <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                          {relativeTime(n.created_at)}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="ml-auto mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                      )}
                    </div>
                  );
                  return n.link ? (
                    <Link key={n.id} href={n.link} onClick={() => setOpen(false)}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={n.id}>{inner}</div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
