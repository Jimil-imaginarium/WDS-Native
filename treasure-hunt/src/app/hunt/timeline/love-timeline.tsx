"use client";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface TimelineItem {
  id: string;
  date: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
}

/** A vertical love timeline with alternating cards. */
export function LoveTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-14 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-500">
          The chapters so far
        </p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Our Love Timeline</h1>
      </header>

      {items.length === 0 ? (
        <div className="glass mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl p-12 text-center">
          <Heart className="h-8 w-8 fill-rose-400 text-rose-400" />
          <p className="text-muted-foreground">
            Our story is being written here soon…
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Spine */}
          <div className="absolute left-5 top-0 h-full w-px bg-gradient-to-b from-rose-300/70 via-rose-400/40 to-transparent sm:left-1/2" />

          <div className="space-y-12">
            {items.map((item, i) => {
              const left = i % 2 === 0;
              return (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className={`relative flex pl-14 sm:w-1/2 sm:pl-0 ${
                    left
                      ? "sm:mr-auto sm:pr-12 sm:text-right"
                      : "sm:ml-auto sm:pl-12"
                  }`}
                >
                  {/* Node */}
                  <span
                    className={`absolute top-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-rose-600 shadow-luxe ${
                      left
                        ? "left-0 sm:left-auto sm:-right-5"
                        : "left-0 sm:-left-5"
                    }`}
                  >
                    <Heart className="h-4 w-4 fill-white text-white" />
                  </span>

                  <div className="glass w-full rounded-3xl p-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-500">
                      {formatDate(item.date)}
                    </p>
                    <h3 className="mt-1.5 font-serif text-2xl">{item.title}</h3>
                    {item.description && (
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        loading="lazy"
                        className="mt-4 w-full rounded-2xl object-cover shadow-glass"
                      />
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
