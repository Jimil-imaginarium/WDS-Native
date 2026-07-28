"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { forkConfig } from "@/lib/schema/defaults";
import { decodeInlineConfigId, isInlineConfigId } from "@/lib/share/codec";
import { getDesign } from "@/lib/supabase/storage";
import { useBuilderStore, type TabId } from "@/store/builderStore";
import { TabBar } from "./TabBar";
import { PriceTicker } from "./PriceTicker";
import { RuleNotice } from "./RuleNotice";
import { DeityTab } from "./tabs/DeityTab";
import { FaceTab } from "./tabs/FaceTab";
import { BodyTab } from "./tabs/BodyTab";
import { VastraTab } from "./tabs/VastraTab";
import { AyudhaTab } from "./tabs/AyudhaTab";
import { PoseTab } from "./tabs/PoseTab";
import { BaseTab } from "./tabs/BaseTab";
import { ColorTab } from "./tabs/ColorTab";
import { ShareTab } from "./tabs/ShareTab";
import { BuyTab } from "./tabs/BuyTab";

// The 3D canvas is client-only and code-split so the shell paints fast
// (Fast-3G budget); the WebGL bundle streams in behind it.
const BuilderCanvas = dynamic(() => import("@/components/three/BuilderCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-stone-400">
      Preparing the murti…
    </div>
  ),
});

const TAB_PANELS: Record<TabId, () => JSX.Element | null> = {
  deity: DeityTab,
  face: FaceTab,
  body: BodyTab,
  vastra: VastraTab,
  ayudha: AyudhaTab,
  pose: PoseTab,
  base: BaseTab,
  color: ColorTab,
  share: ShareTab,
  buy: BuyTab,
};

export function BuilderShell() {
  const config = useBuilderStore((s) => s.config);
  const activeTab = useBuilderStore((s) => s.activeTab);
  const loadConfig = useBuilderStore((s) => s.loadConfig);
  const searchParams = useSearchParams();
  const router = useRouter();
  const loadedRef = useRef(false);

  // ?from=<configId>  — fork a shared design (detached copy)
  // ?load=<designId>  — open one of my saved designs (update-in-place)
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    const from = searchParams.get("from");
    const load = searchParams.get("load");
    if (!from && !load) return;
    (async () => {
      if (from) {
        const config = isInlineConfigId(from)
          ? decodeInlineConfigId(from)
          : (await getDesign(from))?.config ?? null;
        if (config) loadConfig(forkConfig(config), null, "");
      } else if (load) {
        const record = await getDesign(load);
        if (record) loadConfig(record.config, record.id, record.name);
      }
      router.replace("/builder");
    })();
  }, [searchParams, loadConfig, router]);

  const Panel = TAB_PANELS[activeTab];

  return (
    <div className="flex h-dvh flex-col bg-ivory-100 md:flex-row">
      {/* 3D stage */}
      <div className="relative h-[44dvh] shrink-0 md:order-2 md:h-auto md:flex-1">
        <BuilderCanvas config={config} />
        <div className="pointer-events-none absolute left-2 top-2 z-10">
          <Link
            href="/"
            className="pointer-events-auto rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold tracking-tight text-saffron-700 shadow backdrop-blur"
          >
            DivyaForge
          </Link>
        </div>
        <div className="pointer-events-none absolute right-2 top-2 z-10">
          <PriceTicker />
        </div>
        <RuleNotice />
      </div>

      {/* pipeline + panel */}
      <div className="flex min-h-0 flex-1 flex-col md:order-1 md:h-full md:w-[400px] md:flex-none md:flex-row">
        <TabBar />
        <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-8">
          <Panel />
        </div>
      </div>
    </div>
  );
}
