"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Music4, Play } from "lucide-react";
import { Lightbox, type LightboxItem } from "@/components/lightbox";
import type { MediaType } from "@/lib/database.types";

export interface GalleryItem {
  id: string;
  url: string;
  mediaType: MediaType;
  caption?: string | null;
}

/**
 * Renders a riddle's mixed media (photos, GIFs, videos, voice notes,
 * PDFs) as an elegant grid with a lightbox for visual media.
 */
export function MediaGallery({ items }: { items: GalleryItem[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  const visual = items.filter(
    (m) => m.mediaType === "image" || m.mediaType === "gif" || m.mediaType === "video",
  );
  const audio = items.filter((m) => m.mediaType === "audio");
  const docs = items.filter((m) => m.mediaType === "pdf" || m.mediaType === "other");

  const lightboxItems: LightboxItem[] = visual.map((m) => ({
    url: m.url,
    caption: m.caption,
    type: m.mediaType === "video" ? "video" : "image",
  }));

  return (
    <div className="space-y-5">
      {visual.length > 0 && (
        <div
          className={`grid gap-3 ${
            visual.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"
          }`}
        >
          {visual.map((m, i) => (
            <motion.button
              key={m.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setLightboxIndex(i)}
              className="group relative overflow-hidden rounded-2xl border border-border/50 shadow-glass"
            >
              {m.mediaType === "video" ? (
                <div className="relative">
                  <video
                    src={m.url}
                    muted
                    playsInline
                    preload="metadata"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25 transition group-hover:bg-black/10">
                    <span className="rounded-full bg-white/85 p-3 shadow-lg">
                      <Play className="h-5 w-5 fill-rose-500 text-rose-500" />
                    </span>
                  </div>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.url}
                  alt={m.caption ?? "A clue for you"}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
                />
              )}
              {m.caption && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6 text-left text-xs text-white">
                  {m.caption}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      )}

      {audio.map((m) => (
        <div
          key={m.id}
          className="glass flex items-center gap-4 rounded-2xl p-4"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/15">
            <Music4 className="h-5 w-5 text-rose-500" />
          </span>
          <div className="min-w-0 flex-1">
            {m.caption && (
              <p className="mb-1 truncate text-sm font-medium">{m.caption}</p>
            )}
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio src={m.url} controls preload="none" className="w-full" />
          </div>
        </div>
      ))}

      {docs.map((m) => (
        <a
          key={m.id}
          href={m.url}
          target="_blank"
          rel="noreferrer"
          className="glass flex items-center gap-4 rounded-2xl p-4 transition hover:shadow-luxe"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-400/20">
            <FileText className="h-5 w-5 text-gold-600" />
          </span>
          <span className="text-sm font-medium">
            {m.caption ?? "Open attachment"}
          </span>
        </a>
      ))}

      <Lightbox
        items={lightboxItems}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </div>
  );
}
