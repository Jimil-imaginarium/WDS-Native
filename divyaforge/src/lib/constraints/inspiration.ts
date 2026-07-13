import type { DesignConfig } from "@/lib/schema/config";
import type { ConstraintRule, DeityDef, PartDef } from "@/lib/catalog/types";
import { slotsForBody } from "@/lib/catalog/slots";
import { PALETTES, paletteColorsForConfig } from "@/lib/catalog/palettes";
import { canEquip } from "./engine";

/**
 * "Divine Inspiration" (PRD §6.1) — the randomizer. It ONLY samples within
 * constraint-allowed combinations: each slot's candidate pool is filtered
 * through canEquip against the config as it is being built, so limit rules
 * and side rules hold for the final result by construction.
 *
 * It never changes deity, material, or size (DECISIONS.md D11).
 */
export function divineInspiration(
  current: DesignConfig,
  deity: DeityDef,
  parts: PartDef[],
  rules: ConstraintRule[],
  rng: () => number = Math.random,
): DesignConfig {
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
  const slider = () => Math.round(rng() * 100) / 100;

  const next: DesignConfig = {
    ...current,
    form: pick(deity.forms).id,
    pose: pick(deity.poses).id,
    face: {
      eyeOpen: slider(),
      browTilt: slider(),
      smile: slider(),
      trunkCurl: slider(),
      earSize: slider(),
      tuskLength: slider(),
    },
    body: {
      height: slider(),
      weight: slider(),
      armCount: pick([2, 4] as const),
    },
    parts: {},
    colors: { ...current.colors },
    palette: current.palette,
  };

  for (const slot of slotsForBody(next.body)) {
    const candidates = parts.filter(
      (part) => canEquip({ deity, config: next, part, slot, rules }).allowed,
    );
    // Non-required slots may also come up empty (roughly one time in three).
    const includeEmpty = !slot.required && rng() < 1 / 3;
    if (candidates.length === 0 || includeEmpty) {
      next.parts[slot.id] = null;
      continue;
    }
    next.parts[slot.id] = pick(candidates).id;
  }

  const palette = pick(PALETTES);
  next.palette = palette.id;
  next.colors = paletteColorsForConfig(next, palette, deity, parts);
  return next;
}
