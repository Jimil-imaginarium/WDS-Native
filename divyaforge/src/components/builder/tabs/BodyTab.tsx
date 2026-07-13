"use client";

import { useBuilderStore } from "@/store/builderStore";
import { Slider } from "@/components/ui/Slider";
import { SectionLabel } from "@/components/ui/SectionLabel";

export function BodyTab() {
  const body = useBuilderStore((s) => s.config.body);
  const setBodyParam = useBuilderStore((s) => s.setBodyParam);
  const setArmCount = useBuilderStore((s) => s.setArmCount);

  return (
    <div>
      <SectionLabel en="Body" hi="शरीर" />
      <div className="space-y-4">
        <Slider
          label="Height"
          labelHi="ऊँचाई"
          value={body.height}
          onChange={(v) => setBodyParam("height", v)}
        />
        <Slider
          label="Build"
          labelHi="देह"
          value={body.weight}
          onChange={(v) => setBodyParam("weight", v)}
          minLabel="Slender"
          maxLabel="Full"
        />
      </div>

      <SectionLabel
        en="Arms"
        hi="भुजाएँ"
        hint="Chaturbhuj (four-armed) form adds a rear pair of hand slots in the Ayudha tab."
      />
      <div className="grid grid-cols-2 gap-2">
        {([2, 4] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setArmCount(n)}
            className={[
              "rounded-xl border px-3 py-2.5 text-sm font-medium transition",
              body.armCount === n
                ? "border-saffron-500 bg-saffron-50 ring-2 ring-saffron-400"
                : "border-stone-200 bg-white hover:border-saffron-300",
            ].join(" ")}
          >
            {n === 2 ? "2 arms · द्विभुज" : "4 arms · चतुर्भुज"}
          </button>
        ))}
      </div>
      {body.armCount === 4 && (
        <p className="mt-2 text-xs text-saffron-700">
          Two rear-hand slots unlocked — see the Ayudha tab.
        </p>
      )}
    </div>
  );
}
