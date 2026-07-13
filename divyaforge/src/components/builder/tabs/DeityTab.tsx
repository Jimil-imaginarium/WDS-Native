"use client";

import { getDeity } from "@/lib/catalog";
import { useBuilderStore } from "@/store/builderStore";
import { OptionCard } from "@/components/ui/OptionCard";
import { SectionLabel } from "@/components/ui/SectionLabel";

export function DeityTab() {
  const config = useBuilderStore((s) => s.config);
  const setForm = useBuilderStore((s) => s.setForm);
  const inspire = useBuilderStore((s) => s.inspire);
  const deity = getDeity(config.deityId);
  if (!deity) return null;

  return (
    <div>
      <SectionLabel en="Deity" hi="देवता" />
      <div className="rounded-xl border border-saffron-500 bg-saffron-50 p-3 ring-2 ring-saffron-400">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-stone-900">{deity.name.en}</p>
            <p className="text-sm text-stone-500">{deity.name.hi}</p>
          </div>
          <span
            className="rounded-full bg-saffron-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white"
            title="Customization tier A — full customization"
          >
            Tier {deity.tier}
          </span>
        </div>
        <p className="mt-2 text-xs text-stone-500">
          M0 prototype: one deity, end to end. The 21-figure catalog (PRD §6.1)
          plugs into this same menu.
        </p>
      </div>

      <SectionLabel en="Form" hi="स्वरूप" hint="Canonical form presets" />
      <div className="grid grid-cols-2 gap-2">
        {deity.forms.map((form) => (
          <OptionCard
            key={form.id}
            label={form.name.en}
            labelHi={form.name.hi}
            selected={config.form === form.id}
            onSelect={() => setForm(form.id)}
          />
        ))}
      </div>

      <SectionLabel
        en="Divine Inspiration"
        hi="दिव्य प्रेरणा"
        hint="Randomize — only within canonically valid combinations."
      />
      <button
        type="button"
        onClick={inspire}
        className="w-full rounded-xl bg-gradient-to-r from-saffron-500 to-saffron-600 px-4 py-3 text-sm font-semibold text-white shadow hover:from-saffron-600 hover:to-saffron-700"
      >
        ✦ Inspire me
      </button>
    </div>
  );
}
