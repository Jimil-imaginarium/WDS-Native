"use client";

import { useEffect } from "react";
import { useBuilderStore } from "@/store/builderStore";

/** Toast shown when the sacred-rules engine blocks an action. */
export function RuleNotice() {
  const notice = useBuilderStore((s) => s.ruleNotice);
  const clear = useBuilderStore((s) => s.clearRuleNotice);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(clear, 4000);
    return () => clearTimeout(t);
  }, [notice, clear]);

  if (!notice) return null;
  return (
    <div
      role="status"
      className="pointer-events-none absolute inset-x-3 bottom-3 z-10 mx-auto max-w-md rounded-xl border border-maroon-700/20 bg-maroon-700 px-4 py-2.5 text-center shadow-lg"
    >
      <p className="text-xs font-medium text-white">{notice.en}</p>
      <p className="text-[11px] text-white/80">{notice.hi}</p>
    </div>
  );
}
