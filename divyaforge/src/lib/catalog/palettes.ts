import type { DesignConfig } from "@/lib/schema/config";
import type { DeityDef, LocalizedName, PartDef } from "./types";

/**
 * Named preset palettes (PRD §6.1 Tab 12). A palette maps SEMANTIC zone ids
 * (skin, cloth, border, …) to colors; applying one retargets whatever body
 * zones and equipped-part zones currently exist in the config.
 */
export interface PalettePreset {
  id: string;
  name: LocalizedName;
  /** Semantic zone id -> hex color. Zones not listed keep their current color. */
  zoneColors: Record<string, string>;
  /** Representative chips shown on the palette card. */
  chips: string[];
}

export const PALETTES: PalettePreset[] = [
  {
    id: "tanjore-gold",
    name: { en: "Tanjore Gold", hi: "तंजौर स्वर्ण" },
    zoneColors: {
      skin: "#E8A25A",
      tusk: "#F5EFE2",
      eyes: "#2E2014",
      mukut: "#D4A017",
      cloth: "#9B1B1B",
      border: "#D4A017",
      sweet: "#E8C878",
      handle: "#8A5A2B",
      metal: "#D4A017",
      rope: "#C9A227",
      petals: "#E86A8A",
      stem: "#4E7A3A",
      seat: "#D4A017",
      stone: "#C9B79C",
      trim: "#D4A017",
    },
    chips: ["#9B1B1B", "#D4A017", "#E8A25A", "#F5EFE2"],
  },
  {
    id: "kerala-mural",
    name: { en: "Kerala Mural", hi: "केरल भित्तिचित्र" },
    zoneColors: {
      skin: "#D97B29",
      tusk: "#F3ECD9",
      eyes: "#201607",
      mukut: "#B8860B",
      cloth: "#1F6E43",
      border: "#C9A227",
      sweet: "#E3B85C",
      handle: "#6B4423",
      metal: "#B8860B",
      rope: "#A67B2B",
      petals: "#C94F4F",
      stem: "#3F6B2F",
      seat: "#B8860B",
      stone: "#B9A583",
      trim: "#8E1B1B",
    },
    chips: ["#1F6E43", "#C9A227", "#D97B29", "#C94F4F"],
  },
  {
    id: "bengal-patachitra",
    name: { en: "Bengal Patachitra", hi: "बंगाल पटचित्र" },
    zoneColors: {
      skin: "#E8B04B",
      tusk: "#F7F1E1",
      eyes: "#14100A",
      mukut: "#B23A2F",
      cloth: "#143F6B",
      border: "#E8B04B",
      sweet: "#E9C46A",
      handle: "#5B3A1E",
      metal: "#C97B2A",
      rope: "#8E5B2E",
      petals: "#D95F5F",
      stem: "#2F5D3A",
      seat: "#B23A2F",
      stone: "#CBB694",
      trim: "#143F6B",
    },
    chips: ["#143F6B", "#B23A2F", "#E8B04B", "#F7F1E1"],
  },
];

export function getPalette(id: string): PalettePreset | undefined {
  return PALETTES.find((p) => p.id === id);
}

/** Manual swatch grid for per-zone picking. */
export const SWATCHES: string[] = [
  "#9B1B1B", "#B23A2F", "#C94F4F", "#E86A8A",
  "#E8891A", "#E8B325", "#D4A017", "#E8C878",
  "#1F6E43", "#4E7A3A", "#2F5D3A", "#143F6B",
  "#2C4E8A", "#5B3A8A", "#7C5A3A", "#8A5A2B",
  "#2E2014", "#6B6B6B", "#C9B79C", "#F5EFE2",
];

/**
 * Every colorable zone key for the current config:
 * "body:<zone>" for the deity's own zones plus "<partId>:<zone>" for each
 * equipped part (deduped when the same part sits in two hands).
 */
export function zoneKeysForConfig(
  config: Pick<DesignConfig, "parts">,
  deity: DeityDef,
  parts: PartDef[],
): { key: string; name: LocalizedName; semantic: string; defaultColor: string }[] {
  const out = deity.bodyZones.map((z) => ({
    key: `body:${z.id}`,
    name: z.name,
    semantic: z.id,
    defaultColor: z.defaultColor,
  }));
  const seen = new Set<string>();
  for (const partId of Object.values(config.parts)) {
    if (!partId || seen.has(partId)) continue;
    seen.add(partId);
    const part = parts.find((p) => p.id === partId);
    if (!part) continue;
    for (const z of part.colorZones) {
      out.push({
        key: `${part.id}:${z.id}`,
        name: { en: `${part.name.en} — ${z.name.en}`, hi: `${part.name.hi} — ${z.name.hi}` },
        semantic: z.id,
        defaultColor: z.defaultColor,
      });
    }
  }
  return out;
}

/**
 * Full colors map for a config with a palette applied over current colors.
 * Pure — used by the store's applyPalette and by Divine Inspiration.
 */
export function paletteColorsForConfig(
  config: Pick<DesignConfig, "parts" | "colors">,
  palette: PalettePreset,
  deity: DeityDef,
  parts: PartDef[],
): Record<string, string> {
  const next: Record<string, string> = { ...config.colors };
  for (const zone of zoneKeysForConfig(config, deity, parts)) {
    next[zone.key] = palette.zoneColors[zone.semantic] ?? zone.defaultColor;
  }
  return next;
}
