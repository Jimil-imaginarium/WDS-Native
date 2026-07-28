"use client";

import { getDeity } from "@/lib/catalog";
import { useBuilderStore } from "@/store/builderStore";
import { OptionCard } from "@/components/ui/OptionCard";
import { SectionLabel } from "@/components/ui/SectionLabel";

export function PoseTab() {
  const config = useBuilderStore((s) => s.config);
  const setPose = useBuilderStore((s) => s.setPose);
  const deity = getDeity(config.deityId);
  if (!deity) return null;

  return (
    <div>
      <SectionLabel
        en="Mudra & Pose"
        hi="मुद्रा एवं भंगिमा"
        hint="Preset bone rotations on the placeholder rig."
      />
      <div className="space-y-2">
        {deity.poses.map((pose) => (
          <OptionCard
            key={pose.id}
            label={pose.name.en}
            labelHi={pose.name.hi}
            selected={config.pose === pose.id}
            onSelect={() => setPose(pose.id)}
          >
            {pose.description && (
              <span className="text-[11px] text-stone-500">{pose.description.en}</span>
            )}
          </OptionCard>
        ))}
      </div>
    </div>
  );
}
