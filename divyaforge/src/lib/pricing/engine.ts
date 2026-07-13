import type { DesignConfig, MaterialId, SizeInches } from "@/lib/schema/config";
import type { LocalizedName, PartDef } from "@/lib/catalog/types";

/**
 * Pricing engine (PRD §6.3/§9): live price from bounding volume + part count
 * + size multiplier. Pure functions only — the Buy tab and the orders API
 * call the exact same code; the server's result is authoritative.
 *
 * Formula (DECISIONS.md D4):
 *   price = round9( (base(material) + volumeCharge + partsCharge) × sizeMult )
 */

export interface MaterialDef {
  id: MaterialId;
  name: LocalizedName;
  description: LocalizedName;
  basePriceInr: number;
  /** ₹ per bounding-volume unit³ */
  volumeRate: number;
  /** ₹ per part priceVolume unit */
  partRate: number;
}

export const MATERIALS: Record<MaterialId, MaterialDef> = {
  "standard-resin": {
    id: "standard-resin",
    name: { en: "Standard Resin", hi: "स्टैण्डर्ड रेज़िन" },
    description: {
      en: "Grey 3D-printed resin, primed and paintable.",
      hi: "ग्रे 3D-प्रिंटेड रेज़िन, प्राइम्ड और पेंट करने योग्य।",
    },
    basePriceInr: 1499,
    volumeRate: 0.5,
    partRate: 12,
  },
  "premium-resin": {
    id: "premium-resin",
    name: { en: "Premium Resin", hi: "प्रीमियम रेज़िन" },
    description: {
      en: "High-detail durable resin.",
      hi: "उच्च-विवरण टिकाऊ रेज़िन।",
    },
    basePriceInr: 2499,
    volumeRate: 0.8,
    partRate: 18,
  },
  "full-color": {
    id: "full-color",
    name: { en: "Full-Color Print", hi: "फुल-कलर प्रिंट" },
    description: {
      en: "Full-color 3D print, display-ready with your palette.",
      hi: "आपके रंगों के साथ फुल-कलर 3D प्रिंट, सजाने के लिए तैयार।",
    },
    basePriceInr: 3999,
    volumeRate: 1.2,
    partRate: 28,
  },
};

/**
 * Sub-cubic size multipliers: material volume grows with size but fixed
 * costs (printing setup, finishing, packing) don't.
 */
export const SIZE_MULTIPLIERS: Record<SizeInches, number> = {
  4: 1.0,
  6: 1.55,
  8: 2.35,
};

/**
 * Estimated bounding volume (abstract units³) of the configured figure.
 * Derived only from the config — deterministic and mesh-free, so the
 * server can compute it without loading assets.
 */
export function estimateBoundingVolume(
  config: Pick<DesignConfig, "body" | "parts">,
  parts: PartDef[],
): number {
  const { height, weight, armCount } = config.body;
  const h = 10 + 4 * height;
  let w = 5 + 3 * weight;
  const d = 4 + 2 * weight;
  if (armCount === 4) w += 2;

  let volume = h * w * d;

  const basePartId = config.parts["base"];
  if (basePartId) {
    const basePart = parts.find((p) => p.id === basePartId);
    // Bases are authored 0.5 units tall and wider than the figure.
    if (basePart) volume += 0.5 * Math.max(w, 7) * Math.max(d, 7);
  }
  return volume;
}

/** Sum of equipped parts' priceVolume units. */
export function equippedPartsVolume(
  config: Pick<DesignConfig, "parts">,
  parts: PartDef[],
): number {
  let total = 0;
  for (const partId of Object.values(config.parts)) {
    if (!partId) continue;
    const part = parts.find((p) => p.id === partId);
    if (part) total += part.priceVolume;
  }
  return total;
}

/** Round UP to the next ₹…9 ending (1801 → 1809, 1810 → 1819). */
export function round9(n: number): number {
  return Math.floor(n / 10) * 10 + 9;
}

export interface PriceBreakdown {
  material: MaterialId;
  sizeInches: SizeInches;
  baseInr: number;
  volumeUnits: number;
  volumeChargeInr: number;
  partVolumeUnits: number;
  partsChargeInr: number;
  sizeMultiplier: number;
  totalInr: number;
}

export function priceBreakdown(
  config: DesignConfig,
  material: MaterialId,
  sizeInches: SizeInches,
  parts: PartDef[],
): PriceBreakdown {
  const mat = MATERIALS[material];
  const sizeMultiplier = SIZE_MULTIPLIERS[sizeInches];
  const volumeUnits = estimateBoundingVolume(config, parts);
  const partVolumeUnits = equippedPartsVolume(config, parts);
  const volumeChargeInr = Math.round(volumeUnits * mat.volumeRate);
  const partsChargeInr = Math.round(partVolumeUnits * mat.partRate);
  const totalInr = round9(
    (mat.basePriceInr + volumeChargeInr + partsChargeInr) * sizeMultiplier,
  );
  return {
    material,
    sizeInches,
    baseInr: mat.basePriceInr,
    volumeUnits,
    volumeChargeInr,
    partVolumeUnits,
    partsChargeInr,
    sizeMultiplier,
    totalInr,
  };
}

/** The live price (₹) for a config — what the Buy tab ticker shows. */
export function price(
  config: DesignConfig,
  material: MaterialId,
  sizeInches: SizeInches,
  parts: PartDef[],
): number {
  return priceBreakdown(config, material, sizeInches, parts).totalInr;
}

export function formatInr(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}
