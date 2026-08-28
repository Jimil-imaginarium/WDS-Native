"use client";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";

/** Animated full-screen loading state — a heartbeat while we fetch. */
export function LoadingScreen({ label = "Setting the scene…" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative"
      >
        <motion.div
          animate={{ scale: [1, 1.35, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full bg-rose-400/30 blur-xl"
        />
        <motion.div
          animate={{ scale: [1, 1.12, 1, 1.08, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Heart className="h-12 w-12 fill-rose-500 text-rose-500 drop-shadow-lg" />
        </motion.div>
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="font-serif text-lg italic text-muted-foreground"
      >
        {label}
      </motion.p>
    </div>
  );
}
