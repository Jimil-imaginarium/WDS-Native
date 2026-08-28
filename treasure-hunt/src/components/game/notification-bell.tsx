"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useMarkNotificationsRead,
  useNotifications,
} from "@/hooks/use-game-data";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationsRead();

  const unread = notifications.filter((n) => !n.read);

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && unread.length > 0) {
      markRead.mutate(unread.map((n) => n.id));
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="icon"
        onClick={handleOpen}
        className="relative rounded-full"
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread.length > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white shadow-lg shadow-pink-500/50"
          >
            {unread.length > 9 ? "9+" : unread.length}
          </motion.span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-border/60 bg-popover/95 p-2 shadow-2xl backdrop-blur-md"
            >
              {notifications.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  Nothing yet… the adventure is just beginning ✨
                </p>
              ) : (
                notifications.map((n) => {
                  const inner = (
                    <div
                      className={
                        "rounded-lg p-3 transition-colors hover:bg-accent/60 " +
                        (n.read ? "opacity-70" : "")
                      }
                    >
                      <p className="text-sm font-semibold">{n.title}</p>
                      {n.body && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-muted-foreground/70">
                        {formatDateTime(n.created_at)}
                      </p>
                    </div>
                  );
                  return n.link ? (
                    <Link
                      key={n.id}
                      href={n.link}
                      onClick={() => setOpen(false)}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div key={n.id}>{inner}</div>
                  );
                })
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
