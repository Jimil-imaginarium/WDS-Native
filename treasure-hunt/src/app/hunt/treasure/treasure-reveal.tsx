"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Gem, MapPin } from "lucide-react";
import { FloatingHearts } from "@/components/floating-hearts";
import { MusicToggle } from "@/components/music-toggle";
import { MediaGallery, type GalleryItem } from "@/components/media-gallery";
import { HeartDivider } from "@/components/ui/separator";

interface TreasureRevealProps {
  title: string;
  message: string;
  letter: string;
  locationReveal: string;
  gallery: GalleryItem[];
  musicUrl: string | null;
}

/** The emotional finale: hearts, gold confetti, the letter, the reveal. */
export function TreasureReveal({
  title,
  message,
  letter,
  locationReveal,
  gallery,
  musicUrl,
}: TreasureRevealProps) {
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (!opened) return;
    const colors = ["#dcc292", "#cda368", "#e28496", "#ffffff"];
    const bursts = [0, 400, 900];
    const timers = bursts.map((delay) =>
      setTimeout(
        () =>
          confetti({
            particleCount: 140,
            spread: 120,
            startVelocity: 42,
            origin: { y: 0.55 },
            colors,
          }),
        delay,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, [opened]);

  if (!opened) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <FloatingHearts count={16} className="opacity-60" />
        <motion.button
          type="button"
          onClick={() => setOpened(true)}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.6 }}
          className="glass luxe-ring group relative z-10 flex flex-col items-center gap-6 rounded-4xl px-14 py-16"
        >
          <motion.span
            animate={{ rotate: [0, -4, 4, 0], y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-gold-300 to-gold-500 shadow-luxe-lg"
          >
            <Gem className="h-11 w-11 text-white" />
          </motion.span>
          <span className="font-serif text-3xl">The Final Treasure</span>
          <span className="text-sm text-muted-foreground">
            Tap to open, my love
          </span>
        </motion.button>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-2xl">
      <FloatingHearts count={20} className="opacity-50" />

      <div className="relative z-10 space-y-12 text-center">
        <motion.header
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-gold-500">
            Twelve riddles later…
          </p>
          <h1 className="mt-4 font-serif text-5xl leading-tight sm:text-6xl">
            <span className="text-gradient-rose">{title}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-lg font-serif text-xl italic text-muted-foreground">
            {message}
          </p>
          {musicUrl && (
            <div className="mt-6 flex justify-center">
              <MusicToggle src={musicUrl} />
            </div>
          )}
        </motion.header>

        {letter && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.9 }}
            className="glass rounded-4xl p-8 text-left sm:p-12"
          >
            <p className="whitespace-pre-line font-serif text-lg leading-loose text-foreground/90">
              {letter}
            </p>
          </motion.section>
        )}

        {gallery.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.9 }}
            className="text-left"
          >
            <HeartDivider className="mb-8" />
            <h2 className="mb-6 text-center font-serif text-3xl">Us, in pictures</h2>
            <MediaGallery items={gallery} />
          </motion.section>
        )}

        {locationReveal && (
          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            className="luxe-ring mx-auto max-w-lg rounded-4xl bg-gradient-to-br from-rose-500 to-rose-600 p-8 text-white shadow-luxe-lg sm:p-10"
          >
            <MapPin className="mx-auto h-8 w-8" />
            <h2 className="mt-3 font-serif text-2xl">
              Your real treasure is waiting at…
            </h2>
            <p className="mt-3 whitespace-pre-line font-serif text-xl italic">
              {locationReveal}
            </p>
          </motion.section>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="pb-10 font-serif text-lg italic text-muted-foreground"
        >
          Forever yours. ❤
        </motion.p>
      </div>
    </div>
  );
}
