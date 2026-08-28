"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Star {
  id: number;
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
}

/** Twinkling stars scattered across the background. */
export function Sparkles({ count = 40 }: { count?: number }) {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    setStars(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1 + Math.random() * 3,
        delay: Math.random() * 4,
        duration: 2 + Math.random() * 3,
      }))
    );
  }, [count]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {stars.map((s) => (
        <motion.span
          key={s.id}
          className="absolute rounded-full bg-amber-100"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            boxShadow: `0 0 ${s.size * 3}px rgba(253, 230, 138, 0.8)`,
          }}
          animate={{ opacity: [0.1, 0.9, 0.1], scale: [1, 1.4, 1] }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/** A short, localized sparkle burst (e.g. around a chest that just unlocked). */
export function SparkleBurst({ trigger }: { trigger: boolean }) {
  if (!trigger) return null;
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-amber-300"
            style={{ boxShadow: "0 0 8px rgba(252,211,77,0.9)" }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(angle) * 46,
              y: Math.sin(angle) * 46,
              opacity: 0,
              scale: 0.3,
            }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}
