"use client";

import { getDeity, partsForTab, rulesForDeity, SLOTS } from "@/lib/catalog";
import { partsWithDecisions } from "@/lib/constraints/engine";
import { useBuilderStore } from "@/store/builderStore";
import { OptionCard } from "@/components/ui/OptionCard";
import { SectionLabel } from "@/components/ui/SectionLabel";

/** Layered attire slots: lower garment (required) + upper cloth. */
export function VastraTab() {
  const config = useBuilderStore((s) => s.config);
  const equip = useBuilderStore((s) => s.equip);
  const deity = getDeity(config.deityId);
  if (!deity) return null;
  const rules = rulesForDeity(deity.id);
  const parts = partsForTab("vastra", deity.id);

  const layers = [SLOTS.vastraLower, SLOTS.vastraUpper];

  return (
    <div>
      {layers.map((slot) => {
        const options = partsWithDecisions({ deity, config, slot, parts, rules });
        const current = config.parts[slot.id] ?? null;
        return (
          <div key={slot.id}>
            <SectionLabel
              en={slot.name.en}
              hi={slot.name.hi}
              hint={
                slot.required
                  ? "Required layer — a murti is always clothed."
                  : undefined
              }
            />
            <div className="grid grid-cols-2 gap-2">
              {!slot.required && (
                <OptionCard
                  label="None"
                  labelHi="कोई नहीं"
                  selected={current === null}
                  onSelect={() => equip(slot.id, null)}
                />
              )}
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
    </div>
  );
}
