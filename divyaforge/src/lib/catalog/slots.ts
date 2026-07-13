import type { BodyParams } from "@/lib/schema/config";
import type { LocalizedName, PartDef } from "./types";

/**
 * Slot model. Slots are computed from the body configuration — adding an arm
 * pair adds a left+right hand slot pair (PRD §6.1 Tab 2: per-arm gear slots).
 */
export interface SlotDef {
  id: string;
  /** Slot family — a part fits when part.slot === accepts. */
  accepts: string;
  side?: "left" | "right";
  /**
   * Required slots may never be empty (modesty guardrail, PRD §8.2 —
   * the lower garment cannot be removed).
   */
  required?: boolean;
  name: LocalizedName;
}

export const SLOTS: Record<string, SlotDef> = {
  vastraLower: {
    id: "vastraLower",
    accepts: "vastraLower",
    required: true,
    name: { en: "Lower garment", hi: "अधोवस्त्र" },
  },
  vastraUpper: {
    id: "vastraUpper",
    accepts: "vastraUpper",
    name: { en: "Upper cloth", hi: "उत्तरीय" },
  },
  handR1: {
    id: "handR1",
    accepts: "hand",
    side: "right",
    name: { en: "Right hand (front)", hi: "दाहिना हाथ (अग्र)" },
  },
  handL1: {
    id: "handL1",
    accepts: "hand",
    side: "left",
    name: { en: "Left hand (front)", hi: "बायाँ हाथ (अग्र)" },
  },
  handR2: {
    id: "handR2",
    accepts: "hand",
    side: "right",
    name: { en: "Right hand (rear)", hi: "दाहिना हाथ (पश्च)" },
  },
  handL2: {
    id: "handL2",
    accepts: "hand",
    side: "left",
    name: { en: "Left hand (rear)", hi: "बायाँ हाथ (पश्च)" },
  },
  base: {
    id: "base",
    accepts: "base",
    name: { en: "Asana / Base", hi: "आसन" },
  },
};

/** Ordered slots available for a given body configuration. */
export function slotsForBody(body: Pick<BodyParams, "armCount">): SlotDef[] {
  const out = [SLOTS.vastraLower, SLOTS.vastraUpper, SLOTS.handR1, SLOTS.handL1];
  if (body.armCount === 4) out.push(SLOTS.handR2, SLOTS.handL2);
  out.push(SLOTS.base);
  return out;
}

export function getSlot(slotId: string): SlotDef | undefined {
  return SLOTS[slotId];
}

export function isHandSlot(slotId: string): boolean {
  return SLOTS[slotId]?.accepts === "hand";
}

/** Structural fit: does this part belong to this slot family at all? */
export function partFitsSlot(part: PartDef, slot: SlotDef): boolean {
  return part.slot === slot.accepts;
}
