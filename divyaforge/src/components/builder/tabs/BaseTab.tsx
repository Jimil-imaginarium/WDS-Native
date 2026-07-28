"use client";

import { getDeity, partsForTab, rulesForDeity, SLOTS } from "@/lib/catalog";
import { partsWithDecisions } from "@/lib/constraints/engine";
import { useBuilderStore } from "@/store/builderStore";
import { OptionCard } from "@/components/ui/OptionCard";
import { SectionLabel } from "@/components/ui/SectionLabel";

export function BaseTab() {
  const config = useBuilderStore((s) => s.config);
  const equip = useBuilderStore((s) => s.equip);
  const deity = getDeity(config.deityId);
  if (!deity) return null;
  const slot = SLOTS.base;
  const options = partsWithDecisions({
    deity,
    config,
    slot,
    parts: partsForTab("base", deity.id),
    rules: rulesForDeity(deity.id),
  });
  const current = config.parts[slot.id] ?? null;

  return (
    <div>
      <SectionLabel en="Asana / Base" hi="आसन" hint="The figure stands on the base automatically." />
      <div className="grid grid-cols-2 gap-2">
        <OptionCard
          label="None"
          labelHi="कोई नहीं"
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
            disabledReason={decision.allowed ? undefined : decision.reason.en}
          />
        ))}
      </div>
    </div>
  );
}
