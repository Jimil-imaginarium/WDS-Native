import type { Metadata } from "next";
import { decodeInlineConfigId, isInlineConfigId } from "@/lib/share/codec";
import { safeParseDesignConfig, type DesignConfig } from "@/lib/schema/config";
import {
  createServerSupabase,
  isSupabaseConfiguredServer,
} from "@/lib/supabase/server";
import { ShareViewer } from "./ShareViewer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Shared design — DivyaForge" };

interface SharedDesign {
  config: DesignConfig;
  name: string | null;
}

/**
 * Permanent share links (PRD §6.2): /d/[configId] loads the exact design
 * read-only. Inline cfg_ ids decode locally; shortcodes come from the
 * designs table (public rows readable by anyone under RLS).
 */
async function resolveDesign(configId: string): Promise<SharedDesign | null> {
  if (isInlineConfigId(configId)) {
    const config = decodeInlineConfigId(configId);
    return config ? { config, name: null } : null;
  }
  if (!isSupabaseConfiguredServer()) return null;
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("designs")
    .select("name, config")
    .eq("id", configId)
    .maybeSingle();
  if (!data) return null;
  const config = safeParseDesignConfig(data.config);
  return config ? { config, name: data.name } : null;
}

export default async function SharedDesignPage({
  params,
}: {
  params: { configId: string };
}) {
  const design = await resolveDesign(params.configId);

  if (!design) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-2xl font-bold text-stone-900">Design not found</h1>
        <p className="text-sm text-stone-500">
          This share link is invalid, private, or from a newer version of
          DivyaForge.
        </p>
        <a
          href="/builder"
          className="mt-2 rounded-xl bg-saffron-500 px-6 py-2.5 text-sm font-semibold text-white"
        >
          Create your own
        </a>
      </main>
    );
  }

  return (
    <ShareViewer
      config={design.config}
      name={design.name}
      configId={params.configId}
    />
  );
}
