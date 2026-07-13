"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { DesignConfig } from "@/lib/schema/config";
import { getDeity, partsForDeity } from "@/lib/catalog";
import { formatInr, MATERIALS, price } from "@/lib/pricing/engine";

const BuilderCanvas = dynamic(() => import("@/components/three/BuilderCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-stone-400">
      Loading design…
    </div>
  ),
});

interface ShareViewerProps {
  config: DesignConfig;
  name: string | null;
  configId: string;
}

/** Read-only viewer with the "Customize this" fork button. */
export function ShareViewer({ config, name, configId }: ShareViewerProps) {
  const deity = getDeity(config.deityId);
  const total = price(
    config,
    config.material,
    config.sizeInches,
    partsForDeity(config.deityId),
  );

  return (
    <main className="flex h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-2.5">
        <Link href="/" className="text-sm font-bold tracking-tight text-saffron-700">
          DivyaForge
        </Link>
        <span className="truncate px-3 text-sm font-medium text-stone-600">
          {name ?? "Shared design"}
          {deity && (
            <span className="ml-2 text-xs text-stone-400">
              {deity.name.en} · {deity.name.hi}
            </span>
          )}
        </span>
        <span className="text-sm font-bold tabular-nums text-stone-900">
          {formatInr(total)}
        </span>
      </header>
      <div className="relative flex-1">
        <BuilderCanvas config={config} interactive={false} />
        <div className="absolute inset-x-0 bottom-4 flex justify-center">
          <Link
            href={`/builder?from=${encodeURIComponent(configId)}`}
            className="rounded-2xl bg-saffron-500 px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-saffron-600"
          >
            Customize this ✦
          </Link>
        </div>
      </div>
      <footer className="border-t border-stone-200 bg-white px-4 py-2 text-center text-[11px] text-stone-400">
        {MATERIALS[config.material].name.en} · {config.sizeInches}″ · read-only
        view — forking creates your own copy
      </footer>
    </main>
  );
}
