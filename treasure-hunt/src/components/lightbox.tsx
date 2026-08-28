"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export interface LightboxItem {
  url: string;
  caption?: string | null;
  type: "image" | "video";
}

interface LightboxProps {
  items: LightboxItem[];
  index: number | null;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

/** Full-screen photo/video lightbox with keyboard navigation. */
export function Lightbox({ items, index, onClose, onNavigate }: LightboxProps) {
  const open = index !== null && items[index] !== undefined;

  const step = useCallback(
    (delta: number) => {
      if (index === null || items.length === 0) return;
      onNavigate((index + delta + items.length) % items.length);
    },
    [index, items.length, onNavigate],
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, step]);

  return (
    <AnimatePresence>
      {open && index !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={onClose}
        >
          <button
            aria-label="Close"
            onClick={onClose}
            className="absolute right-5 top-5 z-10 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/25"
          >
            <X className="h-5 w-5" />
          </button>

          {items.length > 1 && (
            <>
              <button
                aria-label="Previous"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                className="absolute left-3 z-10 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/25 sm:left-6"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                aria-label="Next"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className="absolute right-3 z-10 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/25 sm:right-6"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <motion.figure
            key={index}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="max-h-[88vh] max-w-[92vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {items[index].type === "video" ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                src={items[index].url}
                controls
                autoPlay
                playsInline
                className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl"
              />
            ) : (
              // Signed Supabase URLs are dynamic — plain img is intentional.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={items[index].url}
                alt={items[index].caption ?? "Memory"}
                className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl"
              />
            )}
            {items[index].caption && (
              <figcaption className="mt-4 text-center font-serif text-lg italic text-white/85">
                {items[index].caption}
              </figcaption>
            )}
          </motion.figure>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
