"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Background music toggle. Renders nothing when no track is set.
 * Autoplay only begins after the first user interaction (browser rules).
 */
export function MusicToggle({
  src,
  className,
}: {
  src: string | null;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [src]);

  if (!src) return null;

  const toggle = async () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.loop = true;
      audioRef.current.volume = 0.35;
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setPlaying(true);
      } catch {
        // Autoplay blocked — user will tap again.
      }
    }
  };

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      onClick={toggle}
      aria-label={playing ? "Pause music" : "Play music"}
      className={cn(
        "glass flex h-10 w-10 items-center justify-center rounded-full text-rose-500 transition hover:shadow-luxe",
        playing && "luxe-ring",
        className,
      )}
    >
      {playing ? (
        <Volume2 className="h-4 w-4 animate-pulse-soft" />
      ) : (
        <VolumeX className="h-4 w-4" />
      )}
    </motion.button>
  );
}
