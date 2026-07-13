"use client";

import { getDeity, partsForTab, rulesForDeity, slotsForBody } from "@/lib/catalog";
import { partsWithDecisions } from "@/lib/constraints/engine";
import { useBuilderStore } from "@/store/builderStore";
import { OptionCard } from "@/components/ui/OptionCard";
import { SectionLabel } from "@/components/ui/SectionLabel";

/**
 * Held items, one section per hand slot — left/right aware. Items denied by
 * the sacred-rules engine render disabled with the rule's reason; equipping
 * them is impossible (PRD §8.2).
 */
export function AyudhaTab() {
  const config = useBuilderStore((s) => s.config);
  const equip = useBuilderStore((s) => s.equip);
  const deity = getDeity(config.deityId);
  if (!deity) return null;
  const rules = rulesForDeity(deity.id);
  const parts = partsForTab("ayudha", deity.id);
  const handSlots = slotsForBody(config.body).filter((s) => s.accepts === "hand");

  return (
    <div>
      {handSlots.map((slot) => {
        const options = partsWithDecisions({ deity, config, slot, parts, rules });
        const current = config.parts[slot.id] ?? null;
        return (
          <div key={slot.id}>
            <SectionLabel
              en={slot.name.en}
              hi={slot.name.hi}
              hint={slot.side === "left" ? "L" : "R"}
            />
            <div className="grid grid-cols-2 gap-2">
              <OptionCard
                label="Empty (mudra)"
                labelHi="मुद्रा"
                selected={current === null}
                onSelect={() => equip(slot.id, null)}
              />
              {options.map(({ part, decision }) => (
                <OptionCard
                  key={part.id}
                  label={part.name.en}
                  labelHi={part.name.hi}
                  thumbnailUrl={part.thumbnailUrl}
                  selected={current === part.id}
                  onSelect={() => equip(slot.id, part.id)}
                  disabledReason={
                    decision.allowed ? undefined : decision.reason.en
                  }
                />
              ))}
            </div>
          </div>
        );
      })}
      <p className="mt-4 text-xs text-stone-400">
        An empty hand renders as a mudra (hand gesture) in the final murti.
      </p>
    </div>
  );
}
