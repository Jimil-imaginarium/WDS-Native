"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TreasureChest } from "@/components/game/treasure-chest";
import { MusicToggle } from "@/components/game/music-toggle";
import {
  fireConfetti,
  fireHearts,
  startFireworks,
} from "@/components/effects/celebrations";
import {
  useFinale,
  useMap,
  useMyAnswers,
} from "@/hooks/use-game-data";
import { getRiddleState } from "@/lib/game";

type Stage = "arrive" | "opening" | "revealed";

export default function FinalePage() {
  const { data: map } = useMap();
  const { data: answers = [] } = useMyAnswers();

  const allDone = useMemo(() => {
    if (!map || map.length === 0) return false;
    return map.every(
      (n) =>
        getRiddleState({
          unlocked: n.unlocked,
          answers: answers.filter((a) => a.riddle_id === n.riddle_id),
          submissions: [],
        }) === "completed" ||
        answers.some(
          (a) => a.riddle_id === n.riddle_id && a.status === "approved"
        )
    );
  }, [map, answers]);

  const { data: finale } = useFinale(allDone);
  const [stage, setStage] = useState<Stage>("arrive");

  // fireworks while revealed
  useEffect(() => {
    if (stage !== "revealed") return;
    fireConfetti();
    const stop = startFireworks(9000);
    const t = setTimeout(fireHearts, 800);
    return () => {
      stop();
      clearTimeout(t);
    };
  }, [stage]);

  if (map && map.length > 0 && !allDone) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <div className="glass rounded-3xl p-10">
          <p className="text-5xl">🔐</p>
          <h1 className="mt-4 font-display text-3xl">Not yet, my love…</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The final treasure only reveals itself when every riddle is solved.
          </p>
          <Button asChild className="mt-6">
            <Link href="/hunt">
              <ArrowLeft className="h-4 w-4" /> Back to the hunt
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <AnimatePresence mode="wait">
        {/* ── Stage 1: the chest awaits ── */}
        {stage === "arrive" && (
          <motion.div
            key="arrive"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.8 }}
            className="flex min-h-[70vh] flex-col items-center justify-center gap-10 text-center"
          >
            <div>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-2 text-xs uppercase tracking-[0.4em] text-amber-300/80"
              >
                Every riddle solved
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="font-display text-5xl text-treasure sm:text-6xl"
              >
                The Final Treasure
              </motion.h1>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9, type: "spring" }}
            >
              <TreasureChest variant="unlocked" size={200} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4 }}
            >
              <Button
                variant="gold"
                size="lg"
                className="px-10 text-lg"
                onClick={() => {
                  setStage("opening");
                  setTimeout(() => setStage("revealed"), 1800);
                }}
              >
                Open the chest ✨
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* ── Stage 2: opening ── */}
        {stage === "opening" && (
          <motion.div
            key="opening"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-[70vh] items-center justify-center"
          >
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 0.6, repeat: 3 }}
            >
              <TreasureChest variant="completed" open size={240} />
            </motion.div>
          </motion.div>
        )}

        {/* ── Stage 3: revealed ── */}
        {stage === "revealed" && (
          <motion.div
            key="revealed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="space-y-10 py-8"
          >
            <div className="flex items-center justify-between">
              <Link
                href="/hunt"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> The map
              </Link>
              <MusicToggle overrideUrl={finale?.music_url} />
            </div>

            <div className="text-center">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="mb-4 inline-block"
              >
                <Heart className="h-14 w-14 fill-pink-400 text-pink-400 drop-shadow-[0_0_18px_rgba(244,114,182,0.8)]" />
              </motion.div>
              <h1 className="font-display text-4xl text-treasure sm:text-6xl">
                {finale?.treasure_title ?? "The Final Treasure"}
              </h1>
            </div>

            <div className="flex justify-center">
              <TreasureChest variant="completed" open size={170} />
            </div>

            {finale?.treasure_image_url && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="flex justify-center"
              >
                <Image
                  src={finale.treasure_image_url}
                  alt="The treasure"
                  width={560}
                  height={400}
                  className="max-h-96 w-auto rounded-2xl border border-amber-300/30 object-cover shadow-[0_0_60px_rgba(251,191,36,0.25)]"
                />
              </motion.div>
            )}

            {finale?.treasure_message && (
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="mx-auto max-w-xl text-center font-display text-xl italic leading-relaxed text-foreground/90"
              >
                {finale.treasure_message}
              </motion.p>
            )}

            {/* the love letter */}
            {finale?.love_letter && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.8 }}
                className="relative mx-auto max-w-xl"
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-3xl">
                  💌
                </div>
                <div
                  className="whitespace-pre-wrap rounded-2xl border border-amber-200/25 p-8 font-display text-lg leading-loose text-amber-50/95 shadow-2xl sm:p-10"
                  style={{
                    background:
                      "linear-gradient(165deg, rgba(120,72,32,0.25) 0%, rgba(60,32,16,0.45) 100%)",
                  }}
                >
                  {finale.love_letter}
                </div>
              </motion.div>
            )}

            <div className="pb-10 text-center text-sm text-muted-foreground">
              The End… and also, always, the beginning. ❤️
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
