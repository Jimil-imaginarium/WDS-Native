import { NextResponse } from "next/server";
import { z } from "zod";
import { designConfigSchema } from "@/lib/schema/config";
import { CATALOG, rulesForDeity } from "@/lib/catalog";
import { validateConfig } from "@/lib/constraints/engine";
import { createServerSupabase, isSupabaseConfiguredServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const saveSchema = z.object({
  id: z.string().min(6).max(64).optional(),
  name: z.string().min(1).max(120),
  config: designConfigSchema,
  isPublic: z.boolean().optional().default(true),
});

function newDesignId(): string {
  // 10-char URL-safe shortcode
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * POST /api/designs — create or update a saved design.
 * The sacred-rules engine runs HERE, server-side, before anything persists
 * (PRD §8.2: the API must validate, not just the UI).
 */
export async function POST(req: Request) {
  if (!isSupabaseConfiguredServer()) {
    return NextResponse.json(
      { error: "Demo mode: designs are saved locally in your browser." },
      { status: 503 },
    );
  }
  const parsed = saveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid design payload." }, { status: 400 });
  }
  const { id, name, config, isPublic } = parsed.data;

  const violations = validateConfig(config, CATALOG, rulesForDeity(config.deityId));
  if (violations.length > 0) {
    return NextResponse.json(
      {
        error: "This design violates iconography rules and cannot be saved.",
        violations: violations.map((v) => ({ slotId: v.slotId, reason: v.reason })),
      },
      { status: 422 },
    );
  }

  const supabase = createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Sign in to save designs." }, { status: 401 });
  }

  const designId = id ?? newDesignId();
  const row = {
    id: designId,
    owner: auth.user.id,
    name,
    config,
    schema_version: config.schemaVersion,
    is_public: isPublic,
    updated_at: new Date().toISOString(),
  };
  // RLS guarantees upsert can only touch the caller's own rows.
  const { error } = await supabase
    .from("designs")
    .upsert(row, { onConflict: "id" });
  if (error) {
    return NextResponse.json({ error: "Could not save design." }, { status: 500 });
  }
  return NextResponse.json({ id: designId });
}

/** GET /api/designs — the signed-in user's saved designs. */
export async function GET() {
  if (!isSupabaseConfiguredServer()) {
    return NextResponse.json({ designs: [] });
  }
  const supabase = createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { data, error } = await supabase
    .from("designs")
    .select("id, name, config, updated_at")
    .eq("owner", auth.user.id)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) {
    return NextResponse.json({ error: "Could not list designs." }, { status: 500 });
  }
  return NextResponse.json({ designs: data ?? [] });
}
