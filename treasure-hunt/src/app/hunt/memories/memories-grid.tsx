"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GalleryHorizontalEnd, Play } from "lucide-react";
import { Lightbox, type LightboxItem } from "@/components/lightbox";
import { formatDate } from "@/lib/utils";
import type { MediaType } from "@/lib/database.types";

interface MemoryItem {
  id: string;
  title: string | null;
  caption: string | null;
  takenOn: string | null;
  mediaType: MediaType;
  url: string;
}

/** A masonry-style memory wall with a lightbox. */
export function MemoriesGrid({ items }: { items: MemoryItem[] }) {
  const [index, setIndex] = useState<number | null>(null);

  const lightboxItems: LightboxItem[] = items.map((m) => ({
    url: m.url,
    caption: m.caption ?? m.title,
    type: m.mediaType === "video" ? "video" : "image",
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-500">
          Our little museum
        </p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Memory Gallery</h1>
      </header>

      {items.length === 0 ? (
        <div className="glass mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl p-12 text-center">
          <GalleryHorizontalEnd className="h-8 w-8 text-rose-400" />
          <p className="text-muted-foreground">
            Memories will appear here as our story grows…
          </p>
        </div>
      ) : (
        <div className="columns-2 gap-4 sm:columns-3 [&>*]:mb-4">
          {items.map((m, i) => (
            <motion.button
              key={m.id}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: (i % 6) * 0.06 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setIndex(i)}
              className="group relative block w-full overflow-hidden rounded-2xl border border-border/50 shadow-glass"
            >
              {m.mediaType === "video" ? (
                <div className="relative">
                  <video
                    src={m.url}
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <span className="rounded-full bg-white/85 p-2.5">
                      <Play className="h-4 w-4 fill-rose-500 text-rose-500" />
                    </span>
                  </span>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.url}
                  alt={m.title ?? "A memory of us"}
                  loading="lazy"
                  className="w-full object-cover transition duration-500 group-hover:scale-105"
                />
              )}
              {(m.title || m.takenOn) && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2.5 pt-8 text-left">
                  {m.title && (
                    <span className="block font-serif text-sm text-white">
                      {m.title}
                    </span>
                  )}
                  {m.takenOn && (
                    <span className="block text-[10px] uppercase tracking-wide text-white/70">
                      {formatDate(m.takenOn)}
                    </span>
                  )}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      )}

      <Lightbox
        items={lightboxItems}
        index={index}
        onClose={() => setIndex(null)}
        onNavigate={setIndex}
      />
    </div>
  );
}
