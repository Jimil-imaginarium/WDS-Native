/**
 * Parts-catalog types. Everything the builder renders or gates on is DATA
 * described by these types — the renderer/UI never special-cases a part id,
 * so swapping placeholder assets for artist-made GLBs is a data change only.
 */

export interface LocalizedName {
  en: string;
  /** Devanagari label — schema-required now, translation quality is M0 placeholder. */
  hi: string;
}

/**
 * Customization tier (PRD §6.1): A = full customization, B = size/material/
 * base only (saints & gurus), C = parametric toggles (Tirthankara system).
 * M0 ships tier A (Ganesh) but the field is part of the schema now.
 */
export type DeityTier = "A" | "B" | "C";

export interface DeityForm {
  id: string;
  name: LocalizedName;
  description?: LocalizedName;
}

export interface PosePreset {
  id: string;
  name: LocalizedName;
  description?: LocalizedName;
}

export interface BodyZone {
  id: string; // semantic zone id, e.g. "skin"
  name: LocalizedName;
  defaultColor: string;
}

export interface DeityDef {
  id: string;
  name: LocalizedName;
  tier: DeityTier;
  /** Iconography tags consulted by constraint rules (e.g. "saumya" = benign form). */
  styleTags: string[];
  forms: DeityForm[];
  poses: PosePreset[];
  /** Colorable zones on the figure itself (parts declare their own). */
  bodyZones: BodyZone[];
  /**
   * Which canonical face-morph sliders apply to this deity (the config always
   * carries all six keys; the Face tab shows only these). Omitted = all.
   */
  faceSliders?: string[];
}

export type PartCategory = "attire" | "ornament" | "ayudha" | "base" | "vahana";

export interface PartColorZone {
  id: string; // semantic zone id — must match a named mesh in the GLB
  name: LocalizedName;
  defaultColor: string;
}

export interface PartDef {
  id: string;
  /** null = universal part usable by any deity. */
  deityId: string | null;
  category: PartCategory;
  /** Builder tab this part is listed under. */
  tab: string;
  /** Slot family this part fits (matches SlotDef.accepts): "hand", "vastraLower", … */
  slot: string;
  name: LocalizedName;
  meshUrl: string;
  thumbnailUrl: string;
  colorZones: PartColorZone[];
  /** Tags consulted by the sacred-rules engine. */
  constraintTags: string[];
  /** Relative volume units feeding the pricing engine. */
  priceVolume: number;
  styleTags: string[];
}

export type ConstraintRuleType = "deny" | "slot_allow" | "limit";

/**
 * A sacred-rule row (PRD §8.2). Rules are pure data; the engine in
 * lib/constraints/engine.ts interprets them. The same rows are seeded into
 * the Postgres `constraints` table for server-side enforcement.
 */
export interface ConstraintRule {
  id: string;
  /** null = applies to every deity. */
  deityId: string | null;
  ruleType: ConstraintRuleType;
  /** Rule fires only for parts carrying this constraint tag. */
  partTag: string;
  /** deny: only when the deity carries this style tag (null/absent = always). */
  deityStyleTag?: string | null;
  /** slot_allow: the ONLY hand side this part may occupy. */
  slotSide?: "left" | "right";
  /** limit: max simultaneous instances of the same part. */
  maxCount?: number;
  /** Shown to the user when the rule blocks an equip — never silent. */
  reason: LocalizedName;
}

export interface CatalogData {
  deities: DeityDef[];
  parts: PartDef[];
  constraints: ConstraintRule[];
}
