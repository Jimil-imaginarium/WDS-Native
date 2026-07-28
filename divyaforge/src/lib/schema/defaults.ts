import type { DesignConfig } from "./config";
import { SCHEMA_VERSION } from "./config";
import { getDeity, getPart } from "@/lib/catalog";
import { zoneKeysForConfig } from "@/lib/catalog/palettes";

/**
 * The respectful neutral default design (PRD §8 / DECISIONS.md D12):
 * standing Ganesh, modak in the left hand, right hand empty in abhaya,
 * classic dhoti, lotus pedestal, Tanjore Gold palette.
 */
export const DEFAULT_DESIGN_NAME = "Mangalmurti (मंगलमूर्ति)";

const BASE_FACE = {
  eyeOpen: 0.55,
  browTilt: 0.5,
  smile: 0.6,
  trunkCurl: 0.5,
  earSize: 0.5,
  tuskLength: 0.6,
};

/** Respectful neutral default per deity (PRD §8 / DECISIONS.md D12). */
const DEITY_DEFAULTS: Record<
  string,
  Pick<DesignConfig, "form" | "pose" | "parts"> & { weight: number }
> = {
  ganesh: {
    form: "standing",
    pose: "ashirwad",
    weight: 0.55,
    parts: {
      vastraLower: "dhoti-classic",
      vastraUpper: null,
      handR1: null, // empty right hand = abhaya mudra in the ashirwad pose
      handL1: "modak",
      base: "lotus-peetha",
    },
  },
  krishna: {
    form: "murlidhar",
    pose: "murali",
    weight: 0.4,
    parts: {
      vastraLower: "dhoti-pitambar",
      vastraUpper: "angavastram",
      handR1: "bansuri",
      handL1: null,
      base: "lotus-peetha",
    },
  },
  shankar: {
    form: "padmasana",
    pose: "dhyana",
    weight: 0.5,
    parts: {
      vastraLower: "dhoti-classic",
      vastraUpper: null,
      handR1: "trishul",
      handL1: "damaru",
      base: "square-peetha",
    },
  },
};

export function defaultConfig(deityId: string = "ganesh"): DesignConfig {
  const preset = DEITY_DEFAULTS[deityId] ?? DEITY_DEFAULTS.ganesh;
  const config: DesignConfig = {
    schemaVersion: SCHEMA_VERSION,
    deityId: DEITY_DEFAULTS[deityId] ? deityId : "ganesh",
    form: preset.form,
    face: { ...BASE_FACE },
    body: {
      height: 0.5,
      weight: preset.weight,
      armCount: 2,
    },
    pose: preset.pose,
    parts: { ...preset.parts },
    colors: {},
    palette: null,
    material: "standard-resin",
    sizeInches: 4,
  };

  // Default colors are each zone's own canonical default (Krishna's shyam
  // blue skin, yellow pitambar, …) — preset palettes recolor only when the
  // user applies one (PRD §6.1 Tab 4 canonical presets).
  const deity = getDeity(config.deityId)!;
  const equippedParts = Object.values(config.parts)
    .filter((id): id is string => id !== null)
    .map((id) => getPart(id)!)
    .filter(Boolean);
  for (const zone of zoneKeysForConfig(config, deity, equippedParts)) {
    config.colors[zone.key] = zone.defaultColor;
  }
  return config;
}

/** A detached editable copy of any config (the share-page "Customize this" fork). */
export function forkConfig(config: DesignConfig): DesignConfig {
  return JSON.parse(JSON.stringify(config)) as DesignConfig;
}
