import type { DesignConfig } from "./config";
import { SCHEMA_VERSION } from "./config";
import { getDeity, getPart } from "@/lib/catalog";
import { getPalette, paletteColorsForConfig } from "@/lib/catalog/palettes";

/**
 * The respectful neutral default design (PRD §8 / DECISIONS.md D12):
 * standing Ganesh, modak in the left hand, right hand empty in abhaya,
 * classic dhoti, lotus pedestal, Tanjore Gold palette.
 */
export const DEFAULT_DESIGN_NAME = "Mangalmurti (मंगलमूर्ति)";

export function defaultConfig(): DesignConfig {
  const config: DesignConfig = {
    schemaVersion: SCHEMA_VERSION,
    deityId: "ganesh",
    form: "standing",
    face: {
      eyeOpen: 0.55,
      browTilt: 0.5,
      smile: 0.6,
      trunkCurl: 0.5,
      earSize: 0.5,
      tuskLength: 0.6,
    },
    body: {
      height: 0.5,
      weight: 0.55,
      armCount: 2,
    },
    pose: "ashirwad",
    parts: {
      vastraLower: "dhoti-classic",
      vastraUpper: null,
      handR1: null, // empty right hand = abhaya mudra in the ashirwad pose
      handL1: "modak",
      base: "lotus-peetha",
    },
    colors: {},
    palette: "tanjore-gold",
    material: "standard-resin",
    sizeInches: 4,
  };

  const deity = getDeity(config.deityId)!;
  const palette = getPalette("tanjore-gold")!;
  const equippedParts = Object.values(config.parts)
    .filter((id): id is string => id !== null)
    .map((id) => getPart(id)!)
    .filter(Boolean);
  config.colors = paletteColorsForConfig(config, palette, deity, equippedParts);
  return config;
}

/** A detached editable copy of any config (the share-page "Customize this" fork). */
export function forkConfig(config: DesignConfig): DesignConfig {
  return JSON.parse(JSON.stringify(config)) as DesignConfig;
}
