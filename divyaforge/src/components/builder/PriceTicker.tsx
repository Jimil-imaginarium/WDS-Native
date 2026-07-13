"use client";

import { partsForDeity } from "@/lib/catalog";
import { formatInr, MATERIALS, price } from "@/lib/pricing/engine";
import { useBuilderStore } from "@/store/builderStore";

/** Always-visible live price — recomputes on every config change. */
export function PriceTicker() {
  const config = useBuilderStore((s) => s.config);
  const setActiveTab = useBuilderStore((s) => s.setActiveTab);
  const total = price(
    config,
    config.material,
    config.sizeInches,
    partsForDeity(config.deityId),
  );
  return (
    <button
      type="button"
      onClick={() => setActiveTab("buy")}
      className="pointer-events-auto flex items-center gap-2 rounded-full border border-stone-200 bg-white/90 px-3 py-1.5 shadow backdrop-blur transition hover:border-saffron-400"
      title="Open the Buy tab"
    >
      <span className="text-[10px] uppercase tracking-wide text-stone-400">
        {MATERIALS[config.material].name.en} · {config.sizeInches}″
      </span>
      <span className="text-sm font-bold tabular-nums text-stone-900">
        {formatInr(total)}
      </span>
    </button>
  );
}
