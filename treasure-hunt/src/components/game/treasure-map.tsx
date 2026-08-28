"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { TreasureChest } from "@/components/game/treasure-chest";
import { cn, formatDateTime } from "@/lib/utils";
import type { MapNode, RiddleState } from "@/lib/types";

interface TreasureMapProps {
  nodes: MapNode[];
  /** riddle_id → derived state (from getRiddleState). */
  states: Record<string, RiddleState>;
}

/** Slightly organic island blob shapes, one per day. */
const ISLAND_PATHS = [
  "M20,60 Q8,42 22,28 Q40,10 68,16 Q92,20 90,44 Q88,66 64,74 Q36,84 20,60 Z",
  "M16,52 Q10,30 34,18 Q58,8 80,22 Q96,34 88,56 Q78,80 48,78 Q24,76 16,52 Z",
  "M24,66 Q6,50 16,30 Q28,10 56,12 Q86,14 90,38 Q94,64 68,76 Q42,86 24,66 Z",
  "M18,58 Q8,36 26,22 Q46,8 72,14 Q94,20 92,46 Q88,72 58,78 Q30,82 18,58 Z",
];

const ISLAND_HUES = [
  { land: "#2f4f3e", beach: "#8a6d46" },
  { land: "#3a4f2f", beach: "#93744b" },
  { land: "#2f4a4f", beach: "#8a6d46" },
  { land: "#4a3a58", beach: "#9c7a50" },
];

function ChestNode({
  node,
  state,
}: {
  node: MapNode;
  state: RiddleState;
}) {
  const variant =
    state === "completed" ? "completed" : state === "locked" ? "locked" : "unlocked";

  const chest = (
    <div className="group relative flex flex-col items-center">
      <TreasureChest variant={variant} size={52} />
      <span
        className={cn(
          "mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm",
          state === "completed"
            ? "bg-amber-400/20 text-amber-200"
            : state === "locked"
            ? "bg-black/40 text-zinc-400"
            : "bg-pink-500/20 text-pink-200"
        )}
      >
        {state === "completed" ? "✨" : state === "locked" ? "🔒" : `#${node.riddle_number}`}
      </span>

      {/* hover tooltip */}
      <div className="pointer-events-none absolute -top-14 left-1/2 z-20 w-44 -translate-x-1/2 scale-90 rounded-lg border border-border/60 bg-popover/95 p-2 text-center opacity-0 shadow-xl backdrop-blur transition-all group-hover:scale-100 group-hover:opacity-100">
        <p className="truncate text-xs font-semibold">
          {node.riddle_title ?? "A hidden riddle…"}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {state === "locked"
            ? `Unlocks ${formatDateTime(node.unlock_at)}`
            : state === "completed"
            ? "Solved with love ✨"
            : "Tap to open!"}
        </p>
      </div>
    </div>
  );

  if (state === "locked") {
    return <div className="cursor-not-allowed">{chest}</div>;
  }
  return (
    <Link href={`/riddle/${node.riddle_id}`} className="cursor-pointer">
      {chest}
    </Link>
  );
}

/**
 * The treasure map: one island per day, three chests per island,
 * connected by a dotted voyage line.
 */
export function TreasureMap({ nodes, states }: TreasureMapProps) {
  const dayNumbers = [...new Set(nodes.map((n) => n.day_number))].sort(
    (a, b) => a - b
  );

  return (
    <div className="relative">
      {/* voyage line connecting islands */}
      <svg
        aria-hidden
        className="absolute left-1/2 top-0 hidden h-full w-24 -translate-x-1/2 lg:block"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <path
          d="M50,2 Q90,15 50,28 Q10,40 50,53 Q90,65 50,78 Q10,90 50,98"
          fill="none"
          stroke="rgba(251,191,36,0.35)"
          strokeWidth="1.5"
          strokeDasharray="3 4"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="relative z-10 flex flex-col gap-10">
        {dayNumbers.map((dayNum, idx) => {
          const dayNodes = nodes
            .filter((n) => n.day_number === dayNum)
            .sort((a, b) => a.riddle_number - b.riddle_number);
          const first = dayNodes[0];
          const hue = ISLAND_HUES[idx % ISLAND_HUES.length];
          const complete = dayNodes.every((n) => states[n.riddle_id] === "completed");
          const anyUnlocked = dayNodes.some((n) => states[n.riddle_id] !== "locked");

          return (
            <motion.div
              key={dayNum}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: idx * 0.08 }}
              className={cn(
                "relative mx-auto w-full max-w-xl",
                idx % 2 === 0 ? "lg:mr-auto lg:ml-8" : "lg:ml-auto lg:mr-8"
              )}
            >
              <div
                className={cn(
                  "relative overflow-hidden rounded-3xl border p-6 backdrop-blur-md transition-shadow",
                  complete
                    ? "border-amber-400/40 shadow-[0_0_40px_rgba(251,191,36,0.15)]"
                    : anyUnlocked
                    ? "border-pink-400/30 shadow-[0_0_40px_rgba(244,114,182,0.12)]"
                    : "border-border/40"
                )}
                style={{
                  background:
                    "linear-gradient(160deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%)",
                }}
              >
                {/* island illustration */}
                <svg
                  aria-hidden
                  viewBox="0 0 100 90"
                  className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 opacity-25"
                >
                  <path d={ISLAND_PATHS[idx % ISLAND_PATHS.length]} fill={hue.beach} />
                  <path
                    d={ISLAND_PATHS[idx % ISLAND_PATHS.length]}
                    fill={hue.land}
                    transform="translate(4,-4) scale(0.92)"
                  />
                  {/* palm tree */}
                  <g transform="translate(48,28)">
                    <rect x="-1.5" y="0" width="3" height="18" rx="1.5" fill="#5b4322" />
                    <path d="M0,2 Q-12,-6 -18,0 Q-8,-2 0,4 Z" fill="#3f7a4f" />
                    <path d="M0,2 Q12,-6 18,0 Q8,-2 0,4 Z" fill="#3f7a4f" />
                    <path d="M0,0 Q-4,-12 -12,-12 Q-4,-8 0,2 Z" fill="#48915d" />
                    <path d="M0,0 Q4,-12 12,-12 Q4,-8 0,2 Z" fill="#48915d" />
                  </g>
                </svg>

                <div className="relative">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-display text-sm tracking-[0.3em] text-amber-300/80">
                      DAY {dayNum}
                    </span>
                    {complete && <span className="text-sm">🏆</span>}
                  </div>
                  <h3 className="font-display text-2xl text-foreground">
                    {first?.island_name ?? `Island ${dayNum}`}
                  </h3>
                  <p className="mb-5 text-sm italic text-muted-foreground">
                    {first?.day_title}
                  </p>

                  <div className="flex items-end justify-around gap-2">
                    {dayNodes.map((n) => (
                      <ChestNode
                        key={n.riddle_id}
                        node={n}
                        state={states[n.riddle_id] ?? "locked"}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
