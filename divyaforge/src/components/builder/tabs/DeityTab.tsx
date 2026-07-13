"use client";

import { CATALOG, getDeity } from "@/lib/catalog";
import { useBuilderStore } from "@/store/builderStore";
import { OptionCard } from "@/components/ui/OptionCard";
import { SectionLabel } from "@/components/ui/SectionLabel";

export function DeityTab() {
  const config = useBuilderStore((s) => s.config);
  const setDeity = useBuilderStore((s) => s.setDeity);
  const setForm = useBuilderStore((s) => s.setForm);
  const inspire = useBuilderStore((s) => s.inspire);
  const deity = getDeity(config.deityId);
  if (!deity) return null;

  return (
    <div>
      <SectionLabel
        en="Deity"
        hi="देवता"
        hint="Switching starts a fresh design for that deity."
      />
      <div className="grid grid-cols-2 gap-2">
        {CATALOG.deities.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDeity(d.id)}
            className={[
              "rounded-xl border p-3 text-left transition",
              config.deityId === d.id
                ? "border-saffron-500 bg-saffron-50 ring-2 ring-saffron-400"
                : "border-stone-200 bg-white hover:border-saffron-300",
            ].join(" ")}
          >
            <span className="flex items-center justify-between">
              <span className="font-semibold text-stone-900">{d.name.en}</span>
              <span
                className="rounded-full bg-saffron-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white"
                title={`Customization tier ${d.tier}`}
              >
                {d.tier}
              </span>
            </span>
            <span className="block text-sm text-stone-500">{d.name.hi}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-stone-400">
        M0+ prototype: the full 21-figure catalog (PRD §6.1) plugs into this
        same menu as data.
      </p>

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
