"use client";

import { create } from "zustand";
import type { DesignConfig, MaterialId, SizeInches } from "@/lib/schema/config";
import { defaultConfig } from "@/lib/schema/defaults";
import {
  getDeity,
  getPart,
  getSlot,
  partsForDeity,
  rulesForDeity,
  slotsForBody,
} from "@/lib/catalog";
import {
  getPalette,
  paletteColorsForConfig,
  zoneKeysForConfig,
} from "@/lib/catalog/palettes";
import { canEquip, type EquipDecision } from "@/lib/constraints/engine";
import { divineInspiration } from "@/lib/constraints/inspiration";
import type { LocalizedName } from "@/lib/catalog/types";

export type TabId =
  | "deity"
  | "face"
  | "body"
  | "vastra"
  | "ayudha"
  | "pose"
  | "base"
  | "color"
  | "share"
  | "buy";

export const TAB_ORDER: TabId[] = [
  "deity", "face", "body", "vastra", "ayudha",
  "pose", "base", "color", "share", "buy",
];

interface BuilderState {
  config: DesignConfig;
  activeTab: TabId;
  /** Zone currently being colored (Color tab). */
  selectedZoneKey: string | null;
  /** DB/local id of the loaded saved design, null for unsaved work. */
  savedDesignId: string | null;
  designName: string;
  dirty: boolean;
  /** Top of the loaded base mesh — the figure stands on it. */
  baseTopY: number;
  /** WebGL canvas for PNG snapshots. */
  glCanvas: HTMLCanvasElement | null;
  /** Transient message when a rule blocks an action (shown as a toast). */
  ruleNotice: LocalizedName | null;

  setActiveTab: (tab: TabId) => void;
  setDeity: (deityId: string) => void;
  setForm: (formId: string) => void;
  setFaceParam: (key: keyof DesignConfig["face"], value: number) => void;
  setBodyParam: (key: "height" | "weight", value: number) => void;
  setArmCount: (count: 2 | 4) => void;
  setPose: (poseId: string) => void;
  equip: (slotId: string, partId: string | null) => EquipDecision;
  setZoneColor: (zoneKey: string, hex: string) => void;
  applyPalette: (paletteId: string) => void;
  setMaterial: (material: MaterialId) => void;
  setSize: (size: SizeInches) => void;
  inspire: () => void;
  resetDesign: () => void;
  loadConfig: (config: DesignConfig, savedId?: string | null, name?: string) => void;
  setDesignName: (name: string) => void;
  markSaved: (id: string) => void;
  setSelectedZone: (zoneKey: string | null) => void;
  setBaseTopY: (y: number) => void;
  setGlCanvas: (canvas: HTMLCanvasElement | null) => void;
  clearRuleNotice: () => void;
}

/** Drop color entries whose part is no longer equipped anywhere. */
function pruneColors(config: DesignConfig): DesignConfig["colors"] {
  const deity = getDeity(config.deityId);
  if (!deity) return config.colors;
  const valid = new Set(
    zoneKeysForConfig(config, deity, partsForDeity(config.deityId)).map((z) => z.key),
  );
  const next: DesignConfig["colors"] = {};
  for (const [key, value] of Object.entries(config.colors)) {
    if (valid.has(key)) next[key] = value;
  }
  return next;
}

/** Seed default colors for zones that don't have one yet (newly equipped parts). */
function fillMissingColors(config: DesignConfig): DesignConfig["colors"] {
  const deity = getDeity(config.deityId);
  if (!deity) return config.colors;
  const palette = config.palette ? getPalette(config.palette) : undefined;
  const next = { ...config.colors };
  for (const zone of zoneKeysForConfig(config, deity, partsForDeity(config.deityId))) {
    if (!next[zone.key]) {
      next[zone.key] = palette?.zoneColors[zone.semantic] ?? zone.defaultColor;
    }
  }
  return next;
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  config: defaultConfig(),
  activeTab: "deity",
  selectedZoneKey: null,
  savedDesignId: null,
  designName: "",
  dirty: false,
  baseTopY: 0,
  glCanvas: null,
  ruleNotice: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  setDeity: (deityId) =>
    set((s) => {
      if (s.config.deityId === deityId || !getDeity(deityId)) return s;
      // Fresh respectful default for the new deity; keep material/size.
      const config = defaultConfig(deityId);
      config.material = s.config.material;
      config.sizeInches = s.config.sizeInches;
      return {
        config,
        savedDesignId: null,
        designName: "",
        dirty: true,
        selectedZoneKey: null,
      };
    }),

  setForm: (formId) =>
    set((s) => ({ config: { ...s.config, form: formId }, dirty: true })),

  setFaceParam: (key, value) =>
    set((s) => ({
      config: { ...s.config, face: { ...s.config.face, [key]: value } },
      dirty: true,
    })),

  setBodyParam: (key, value) =>
    set((s) => ({
      config: { ...s.config, body: { ...s.config.body, [key]: value } },
      dirty: true,
    })),

  setArmCount: (count) =>
    set((s) => {
      const parts = { ...s.config.parts };
      if (count === 4) {
        parts.handR2 = parts.handR2 ?? null;
        parts.handL2 = parts.handL2 ?? null;
      } else {
        // Rear-hand gear has no slot with two arms — unequip it.
        delete parts.handR2;
        delete parts.handL2;
      }
      const config = {
        ...s.config,
        body: { ...s.config.body, armCount: count },
        parts,
      };
      config.colors = pruneColors(config);
      return { config, dirty: true };
    }),

  setPose: (poseId) =>
    set((s) => ({ config: { ...s.config, pose: poseId }, dirty: true })),

  equip: (slotId, partId) => {
    const s = get();
    const deity = getDeity(s.config.deityId);
    const slot = getSlot(slotId);
    if (!deity || !slot) {
      return { allowed: false, reason: { en: "Unknown slot.", hi: "अज्ञात स्थान।" }, ruleId: null };
    }
    if (partId === null) {
      if (slot.required) {
        const reason = {
          en: "This garment cannot be removed.",
          hi: "यह वस्त्र हटाया नहीं जा सकता।",
        };
        set({ ruleNotice: reason });
        return { allowed: false, reason, ruleId: null };
      }
      const config = { ...s.config, parts: { ...s.config.parts, [slotId]: null } };
      config.colors = pruneColors(config);
      set({ config, dirty: true });
      return { allowed: true };
    }
    const part = getPart(partId);
    if (!part) {
      return { allowed: false, reason: { en: "Unknown part.", hi: "अज्ञात वस्तु।" }, ruleId: null };
    }
    const decision = canEquip({
      deity,
      config: s.config,
      part,
      slot,
      rules: rulesForDeity(deity.id),
    });
    if (!decision.allowed) {
      // The UI disables denied parts, but the store is the last line of
      // defense client-side (the API re-validates server-side).
      set({ ruleNotice: decision.reason });
      return decision;
    }
    const config = { ...s.config, parts: { ...s.config.parts, [slotId]: partId } };
    config.colors = fillMissingColors(config);
    config.colors = pruneColors(config);
    set({ config, dirty: true });
    return decision;
  },

  setZoneColor: (zoneKey, hex) =>
    set((s) => ({
      config: {
        ...s.config,
        colors: { ...s.config.colors, [zoneKey]: hex },
        palette: null, // manual edit — no longer a pure preset
      },
      dirty: true,
    })),

  applyPalette: (paletteId) =>
    set((s) => {
      const deity = getDeity(s.config.deityId);
      const palette = getPalette(paletteId);
      if (!deity || !palette) return s;
      return {
        config: {
          ...s.config,
          palette: paletteId,
          colors: paletteColorsForConfig(
            s.config, palette, deity, partsForDeity(s.config.deityId),
          ),
        },
        dirty: true,
      };
    }),

  setMaterial: (material) =>
    set((s) => ({ config: { ...s.config, material }, dirty: true })),

  setSize: (sizeInches) =>
    set((s) => ({ config: { ...s.config, sizeInches }, dirty: true })),

  inspire: () =>
    set((s) => {
      const deity = getDeity(s.config.deityId);
      if (!deity) return s;
      return {
        config: divineInspiration(
          s.config, deity, partsForDeity(deity.id), rulesForDeity(deity.id),
        ),
        dirty: true,
      };
    }),

  resetDesign: () =>
    set({
      config: defaultConfig(),
      savedDesignId: null,
      designName: "",
      dirty: false,
      selectedZoneKey: null,
    }),

  loadConfig: (config, savedId = null, name = "") =>
    set({
      config,
      savedDesignId: savedId,
      designName: name,
      dirty: false,
      selectedZoneKey: null,
    }),

  setDesignName: (name) => set({ designName: name }),
  markSaved: (id) => set({ savedDesignId: id, dirty: false }),
  setSelectedZone: (zoneKey) => set({ selectedZoneKey: zoneKey }),
  setBaseTopY: (y) => set({ baseTopY: y }),
  setGlCanvas: (canvas) => set({ glCanvas: canvas }),
  clearRuleNotice: () => set({ ruleNotice: null }),
}));

/** Slots for the current body config — convenience selector. */
export function useSlots() {
  return useBuilderStore((s) => slotsForBody(s.config.body));
}
