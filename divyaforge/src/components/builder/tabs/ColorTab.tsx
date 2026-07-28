"use client";

import { getDeity, partsForDeity } from "@/lib/catalog";
import { PALETTES, SWATCHES, zoneKeysForConfig } from "@/lib/catalog/palettes";
import { useBuilderStore } from "@/store/builderStore";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Swatch } from "@/components/ui/Swatch";

/**
 * Zone-based coloring: pick a zone here (or tap it directly on the murti),
 * then pick a color. Preset palettes recolor every current zone at once.
 */
export function ColorTab() {
  const config = useBuilderStore((s) => s.config);
  const selectedZoneKey = useBuilderStore((s) => s.selectedZoneKey);
  const setSelectedZone = useBuilderStore((s) => s.setSelectedZone);
  const setZoneColor = useBuilderStore((s) => s.setZoneColor);
  const applyPalette = useBuilderStore((s) => s.applyPalette);
  const deity = getDeity(config.deityId);
  if (!deity) return null;

  const zones = zoneKeysForConfig(config, deity, partsForDeity(deity.id));
  const active = selectedZoneKey ?? zones[0]?.key ?? null;
  const activeColor = active ? config.colors[active] : undefined;

  return (
    <div>
      <SectionLabel en="Preset palettes" hi="रंग-संयोजन" />
      <div className="grid grid-cols-3 gap-2">
        {PALETTES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPalette(p.id)}
            className={[
              "rounded-xl border p-2 text-left transition",
              config.palette === p.id
                ? "border-saffron-500 bg-saffron-50 ring-2 ring-saffron-400"
                : "border-stone-200 bg-white hover:border-saffron-300",
            ].join(" ")}
          >
            <span className="flex gap-1">
              {p.chips.map((c) => (
                <span
                  key={c}
                  className="h-4 w-4 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: c }}
                />
              ))}
            </span>
            <span className="mt-1 block text-[11px] font-medium leading-tight text-stone-800">
              {p.name.en}
            </span>
            <span className="block text-[10px] text-stone-500">{p.name.hi}</span>
          </button>
        ))}
      </div>

      <SectionLabel
        en="Zones"
        hi="क्षेत्र"
        hint="Tip: tap any part of the murti in the 3D view to select its zone."
      />
      <div className="flex flex-wrap gap-1.5">
        {zones.map((z) => (
          <button
            key={z.key}
            type="button"
            onClick={() => setSelectedZone(z.key)}
            className={[
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition",
              active === z.key
                ? "border-saffron-500 bg-saffron-50 font-semibold"
                : "border-stone-200 bg-white hover:border-saffron-300",
            ].join(" ")}
          >
            <span
              className="h-3.5 w-3.5 rounded-full border border-stone-300"
              style={{ backgroundColor: config.colors[z.key] ?? z.defaultColor }}
            />
            {z.name.en}
          </button>
        ))}
      </div>

      {active && (
        <>
          <SectionLabel en="Colour" hi="रंग" />
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((c) => (
              <Swatch
                key={c}
                color={c}
                selected={activeColor?.toLowerCase() === c.toLowerCase()}
                onSelect={(color) => setZoneColor(active, color)}
              />
            ))}
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-stone-600">
            Custom:
            <input
              type="color"
              value={activeColor ?? "#cccccc"}
              onChange={(e) => setZoneColor(active, e.target.value)}
              className="h-8 w-14 cursor-pointer rounded border border-stone-200 bg-white"
            />
            <span className="tabular-nums text-stone-400">{activeColor}</span>
          </label>
        </>
      )}
    </div>
  );
}
