"use client";

import { getDeity } from "@/lib/catalog";
import { useBuilderStore } from "@/store/builderStore";
import { Slider } from "@/components/ui/Slider";
import { SectionLabel } from "@/components/ui/SectionLabel";

const FACE_SLIDERS = [
  { key: "eyeOpen", en: "Eyes", hi: "नेत्र", min: "Meditative", max: "Open" },
  { key: "browTilt", en: "Brows", hi: "भृकुटि", min: "Soft", max: "Raised" },
  { key: "smile", en: "Smile", hi: "स्मित", min: "Serene", max: "Joyful" },
  { key: "trunkCurl", en: "Trunk curl", hi: "शुण्ड", min: "Left", max: "Right" },
  { key: "earSize", en: "Ears", hi: "कर्ण", min: "Small", max: "Grand" },
  { key: "tuskLength", en: "Tusk", hi: "दन्त", min: "Short", max: "Long" },
] as const;

export function FaceTab() {
  const face = useBuilderStore((s) => s.config.face);
  const deityId = useBuilderStore((s) => s.config.deityId);
  const setFaceParam = useBuilderStore((s) => s.setFaceParam);
  const deity = getDeity(deityId);
  // The deity record says which canonical morphs apply (e.g. no trunk/tusk
  // sliders for Krishna); omitted = all.
  const active = FACE_SLIDERS.filter(
    (s) => !deity?.faceSliders || deity.faceSliders.includes(s.key),
  );

  return (
    <div>
      <SectionLabel
        en="Face & Expression"
        hi="मुख एवं भाव"
        hint="Placeholder morphs — artist blendshapes swap in via the same 0–1 parameters."
      />
      <div className="space-y-4">
        {active.map((s) => (
          <Slider
            key={s.key}
            label={s.en}
            labelHi={s.hi}
            value={face[s.key]}
            onChange={(v) => setFaceParam(s.key, v)}
            minLabel={s.min}
            maxLabel={s.max}
          />
        ))}
      </div>
      {deityId === "ganesh" && (
        <p className="mt-4 text-xs text-stone-400">
          The right tusk stays short — Ekadanta iconography.
        </p>
      )}
    </div>
  );
}
