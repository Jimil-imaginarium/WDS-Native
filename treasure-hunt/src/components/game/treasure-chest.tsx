"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type ChestVariant = "locked" | "unlocked" | "completed";

interface TreasureChestProps {
  variant: ChestVariant;
  /** When true the lid animates open (used on approval + finale). */
  open?: boolean;
  size?: number;
  className?: string;
}

/**
 * Hand-drawn SVG treasure chest with three visual states:
 *  locked    → dim wood, closed, padlock
 *  unlocked  → warm glow, gently bouncing, ready to open
 *  completed → golden, lid open, light pouring out
 */
export function TreasureChest({
  variant,
  open,
  size = 96,
  className,
}: TreasureChestProps) {
  const isOpen = open || variant === "completed";
  const golden = variant === "completed";
  const glowing = variant === "unlocked";

  const wood = golden ? "#b45309" : variant === "locked" ? "#4b3826" : "#8a5a2b";
  const woodDark = golden ? "#92400e" : variant === "locked" ? "#38291b" : "#6b4423";
  const trim = golden ? "#fbbf24" : variant === "locked" ? "#6b7280" : "#d4a34f";
  const inner = "#2a1a10";

  return (
    <motion.div
      className={cn("relative inline-block", className)}
      style={{ width: size, height: size }}
      animate={
        glowing
          ? { y: [0, -5, 0] }
          : golden
          ? { scale: [1, 1.03, 1] }
          : {}
      }
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* glow halo */}
      {(glowing || golden) && (
        <motion.div
          className="absolute inset-0 rounded-full blur-xl"
          style={{
            background: golden
              ? "radial-gradient(circle, rgba(251,191,36,0.55) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(244,114,182,0.45) 0%, transparent 70%)",
          }}
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.15, 0.9] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="relative"
      >
        {/* light rays when open */}
        {isOpen && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            {[-30, -15, 0, 15, 30].map((a) => (
              <rect
                key={a}
                x="48"
                y="6"
                width="4"
                height="34"
                rx="2"
                fill="url(#ray)"
                transform={`rotate(${a} 50 44)`}
              />
            ))}
          </motion.g>
        )}

        <defs>
          <linearGradient id="ray" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0" />
            <stop offset="100%" stopColor="#fde68a" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="goldpile" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>

        {/* chest body */}
        <rect x="14" y="46" width="72" height="38" rx="6" fill={wood} />
        <rect x="14" y="46" width="72" height="8" fill={woodDark} />
        {/* body planks */}
        <line x1="30" y1="54" x2="30" y2="84" stroke={woodDark} strokeWidth="2" />
        <line x1="50" y1="54" x2="50" y2="84" stroke={woodDark} strokeWidth="2" />
        <line x1="70" y1="54" x2="70" y2="84" stroke={woodDark} strokeWidth="2" />
        {/* trim */}
        <rect x="12" y="44" width="76" height="5" rx="2.5" fill={trim} />
        <rect x="12" y="80" width="76" height="5" rx="2.5" fill={trim} />

        {/* treasure inside (visible when open) */}
        {isOpen && (
          <motion.g
            initial={{ y: 6, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <ellipse cx="50" cy="47" rx="30" ry="7" fill="url(#goldpile)" />
            <circle cx="38" cy="44" r="4" fill="#fde68a" />
            <circle cx="52" cy="42" r="4.5" fill="#fcd34d" />
            <circle cx="64" cy="44" r="4" fill="#fde68a" />
            <motion.text
              x="50"
              y="40"
              textAnchor="middle"
              fontSize="14"
              animate={{ y: [40, 34, 40] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              💖
            </motion.text>
          </motion.g>
        )}

        {/* lid — rotates open around back edge */}
        <motion.g
          style={{ originX: "50px", originY: "46px" }}
          animate={isOpen ? { rotateX: 0, y: -26, scaleY: 0.55 } : { y: 0, scaleY: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 14 }}
        >
          <path
            d="M14 46 Q14 22 50 22 Q86 22 86 46 Z"
            fill={wood}
          />
          <path
            d="M14 46 Q14 22 50 22 Q86 22 86 46"
            fill="none"
            stroke={trim}
            strokeWidth="4"
          />
          <line x1="35" y1="26" x2="35" y2="45" stroke={woodDark} strokeWidth="2" />
          <line x1="65" y1="26" x2="65" y2="45" stroke={woodDark} strokeWidth="2" />
        </motion.g>

        {/* clasp + padlock */}
        {!isOpen && (
          <g>
            <rect x="44" y="42" width="12" height="14" rx="2" fill={trim} />
            {variant === "locked" && (
              <g>
                <rect x="45" y="50" width="10" height="9" rx="2" fill="#374151" />
                <path
                  d="M47 50 v-3 a3 3 0 0 1 6 0 v3"
                  fill="none"
                  stroke="#6b7280"
                  strokeWidth="2"
                />
                <circle cx="50" cy="54.5" r="1.6" fill="#111827" />
              </g>
            )}
            {variant === "unlocked" && (
              <circle cx="50" cy="49" r="2.5" fill={inner} />
            )}
          </g>
        )}
      </svg>
    </motion.div>
  );
}
