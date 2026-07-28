import { NextResponse } from "next/server";
import { createServerSupabase, isSupabaseConfiguredServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/designs/[id] — a single design. RLS makes this return the row
 * only when it is public or owned by the caller.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!isSupabaseConfiguredServer()) {
    return NextResponse.json({ error: "Demo mode." }, { status: 503 });
  }
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("designs")
    .select("id, name, config, updated_at, is_public")
    .eq("id", params.id)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Design not found." }, { status: 404 });
  }
  return NextResponse.json({ design: data });
}

/** DELETE /api/designs/[id] — owner only (enforced by RLS). */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!isSupabaseConfiguredServer()) {
    return NextResponse.json({ error: "Demo mode." }, { status: 503 });
  }
  const supabase = createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { error } = await supabase.from("designs").delete().eq("id", params.id);
  if (error) {
    return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
