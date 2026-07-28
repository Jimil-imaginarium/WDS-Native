import { z } from "zod";

/**
 * The DesignConfig is THE saved/shared artifact of DivyaForge (PRD §9):
 * a lightweight JSON parameter config — never a mesh. Every persisted or
 * shared design carries `schemaVersion` so future migrations can upgrade
 * old configs on load.
 */
export const SCHEMA_VERSION = 1 as const;

export const MATERIAL_IDS = [
  "standard-resin",
  "premium-resin",
  "full-color",
] as const;
export type MaterialId = (typeof MATERIAL_IDS)[number];

export const SIZES_INCHES = [4, 6, 8] as const;
export type SizeInches = (typeof SIZES_INCHES)[number];

/** All face sliders are normalized 0..1 (0.5 = neutral unless noted). */
export const faceSchema = z.object({
  /** 0 = meditative half-closed, 1 = fully open */
  eyeOpen: z.number().min(0).max(1),
  browTilt: z.number().min(0).max(1),
  smile: z.number().min(0).max(1),
  trunkCurl: z.number().min(0).max(1),
  earSize: z.number().min(0).max(1),
  tuskLength: z.number().min(0).max(1),
});

export const bodySchema = z.object({
  height: z.number().min(0).max(1),
  weight: z.number().min(0).max(1),
  /** Multi-arm iconography is first-class (PRD §6.1 Tab 2). */
  armCount: z.union([z.literal(2), z.literal(4)]),
});

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const designConfigSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  deityId: z.string().min(1),
  /** Deity form preset id, e.g. "standing" | "seated". */
  form: z.string().min(1),
  face: faceSchema,
  body: bodySchema,
  /** Pose preset id, e.g. "ashirwad" | "dhyana" | "nritya". */
  pose: z.string().min(1),
  /**
   * slotId -> partId (or null for empty). Slots are computed from the body
   * (arm count adds hand slots) — see lib/catalog/slots.ts.
   */
  parts: z.record(z.string(), z.string().nullable()),
  /**
   * Zone colors, keyed "body:<zone>" for the figure itself and
   * "<partId>:<zone>" for equipped parts. Zone ids are semantic
   * (skin/cloth/border/…) so palettes can retarget them.
   */
  colors: z.record(z.string(), hexColor),
  /** Last applied preset palette id (display hint only). */
  palette: z.string().nullable(),
  material: z.enum(MATERIAL_IDS),
  sizeInches: z.union([z.literal(4), z.literal(6), z.literal(8)]),
});

export type FaceParams = z.infer<typeof faceSchema>;
export type BodyParams = z.infer<typeof bodySchema>;
export type DesignConfig = z.infer<typeof designConfigSchema>;

/** Parse unknown JSON into a DesignConfig (throws ZodError on mismatch). */
export function parseDesignConfig(input: unknown): DesignConfig {
  return designConfigSchema.parse(input);
}

export function safeParseDesignConfig(input: unknown): DesignConfig | null {
  const r = designConfigSchema.safeParse(input);
  return r.success ? r.data : null;
}
