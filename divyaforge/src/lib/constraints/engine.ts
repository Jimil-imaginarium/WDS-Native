import type { DesignConfig } from "@/lib/schema/config";
import type {
  ConstraintRule,
  DeityDef,
  LocalizedName,
  PartDef,
} from "@/lib/catalog/types";
import { partFitsSlot, slotsForBody, type SlotDef } from "@/lib/catalog/slots";

/**
 * Sacred-rules engine (PRD §8.2). This is not decoration: the builder UI
 * consults it before every equip (denied parts are un-equippable and show the
 * rule's reason), the store re-validates on every mutation, and the API
 * routes run validateConfig() server-side before any save or order.
 */

export type EquipDecision =
  | { allowed: true }
  | { allowed: false; reason: LocalizedName; ruleId: string | null };

const STRUCTURAL_REASONS = {
  wrongSlot: {
    en: "This item does not fit this slot.",
    hi: "यह वस्तु इस स्थान के लिए उपयुक्त नहीं है।",
  },
  wrongDeity: {
    en: "This item is not part of this deity's catalog.",
    hi: "यह वस्तु इस देवता की सूची में उपलब्ध नहीं है।",
  },
  requiredSlot: {
    en: "This garment cannot be removed.",
    hi: "यह वस्त्र हटाया नहीं जा सकता।",
  },
  unknownPart: {
    en: "Unknown part.",
    hi: "अज्ञात वस्तु।",
  },
  unknownSlot: {
    en: "This slot is not available for the current body configuration.",
    hi: "यह स्थान वर्तमान शरीर-रचना में उपलब्ध नहीं है।",
  },
} satisfies Record<string, LocalizedName>;

function denied(reason: LocalizedName, ruleId: string | null = null): EquipDecision {
  return { allowed: false, reason, ruleId };
}

export interface CanEquipArgs {
  deity: DeityDef;
  config: DesignConfig;
  part: PartDef;
  slot: SlotDef;
  rules: ConstraintRule[];
}

/**
 * May `part` occupy `slot` given the rest of `config`?
 * The part currently in the target slot (if any) is treated as replaced,
 * i.e. excluded from limit counting.
 */
export function canEquip({ deity, config, part, slot, rules }: CanEquipArgs): EquipDecision {
  // Structural checks first — these are not rule rows.
  if (!partFitsSlot(part, slot)) return denied(STRUCTURAL_REASONS.wrongSlot);
  if (part.deityId !== null && part.deityId !== deity.id) {
    return denied(STRUCTURAL_REASONS.wrongDeity);
  }

  for (const rule of rules) {
    if (rule.deityId !== null && rule.deityId !== deity.id) continue;
    if (!part.constraintTags.includes(rule.partTag)) continue;

    switch (rule.ruleType) {
      case "deny": {
        const styleMatch =
          !rule.deityStyleTag || deity.styleTags.includes(rule.deityStyleTag);
        if (styleMatch) return denied(rule.reason, rule.id);
        break;
      }
      case "slot_allow": {
        if (slot.side !== rule.slotSide) return denied(rule.reason, rule.id);
        break;
      }
      case "limit": {
        const max = rule.maxCount ?? 1;
        const count = Object.entries(config.parts).filter(
          ([slotId, partId]) => slotId !== slot.id && partId === part.id,
        ).length;
        if (count >= max) return denied(rule.reason, rule.id);
        break;
      }
    }
  }
  return { allowed: true };
}

/** Every structurally-fitting part for a slot, with its equip decision — drives the UI grids. */
export function partsWithDecisions(
  args: Omit<CanEquipArgs, "part"> & { parts: PartDef[] },
): { part: PartDef; decision: EquipDecision }[] {
  const { parts, ...rest } = args;
  return parts
    .filter((p) => partFitsSlot(p, rest.slot) && (p.deityId === null || p.deityId === rest.deity.id))
    .map((part) => ({ part, decision: canEquip({ ...rest, part }) }));
}

export interface ConfigViolation {
  slotId: string;
  partId: string | null;
  reason: LocalizedName;
  ruleId: string | null;
}

export interface CatalogSlice {
  deities: DeityDef[];
  parts: PartDef[];
}

/**
 * Full-config validation — the server-side gate for /api/designs and
 * /api/orders, and the client-side re-check after structural edits.
 * Returns [] when the config is clean.
 */
export function validateConfig(
  config: DesignConfig,
  catalog: CatalogSlice,
  rules: ConstraintRule[],
): ConfigViolation[] {
  const violations: ConfigViolation[] = [];
  const deity = catalog.deities.find((d) => d.id === config.deityId);
  if (!deity) {
    return [{ slotId: "*", partId: null, reason: STRUCTURAL_REASONS.wrongDeity, ruleId: null }];
  }

  const slots = slotsForBody(config.body);
  const slotIds = new Set(slots.map((s) => s.id));

  // Parts parked in slots that don't exist for this body (e.g. rear hands after
  // switching back to two arms) are violations, not silently ignored.
  for (const [slotId, partId] of Object.entries(config.parts)) {
    if (partId !== null && !slotIds.has(slotId)) {
      violations.push({ slotId, partId, reason: STRUCTURAL_REASONS.unknownSlot, ruleId: null });
    }
  }

  for (const slot of slots) {
    const partId = config.parts[slot.id] ?? null;
    if (partId === null) {
      if (slot.required) {
        violations.push({
          slotId: slot.id,
          partId: null,
          reason: STRUCTURAL_REASONS.requiredSlot,
          ruleId: null,
        });
      }
      continue;
    }
    const part = catalog.parts.find((p) => p.id === partId);
    if (!part) {
      violations.push({
        slotId: slot.id,
        partId,
        reason: STRUCTURAL_REASONS.unknownPart,
        ruleId: null,
      });
      continue;
    }
    const decision = canEquip({ deity, config, part, slot, rules });
    if (!decision.allowed) {
      violations.push({
        slotId: slot.id,
        partId,
        reason: decision.reason,
        ruleId: decision.ruleId,
      });
    }
  }
  return violations;
}
