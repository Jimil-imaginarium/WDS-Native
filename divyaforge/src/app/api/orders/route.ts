import { NextResponse } from "next/server";
import { z } from "zod";
import { designConfigSchema, MATERIAL_IDS } from "@/lib/schema/config";
import { CATALOG, partsForDeity, rulesForDeity } from "@/lib/catalog";
import { validateConfig } from "@/lib/constraints/engine";
import { price } from "@/lib/pricing/engine";
import { createServerSupabase, isSupabaseConfiguredServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const orderSchema = z.object({
  config: designConfigSchema,
  material: z.enum(MATERIAL_IDS),
  sizeInches: z.union([z.literal(4), z.literal(6), z.literal(8)]),
  designId: z.string().optional(),
});

function newOrderId(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return "DF-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * POST /api/orders — the M0 checkout stub.
 * Validates the config against the sacred-rules engine, recomputes the price
 * server-side (the client's number is never trusted), and records an order
 * row with status 'stub_created'. No payment is taken in M0.
 */
export async function POST(req: Request) {
  if (!isSupabaseConfiguredServer()) {
    return NextResponse.json(
      { error: "Demo mode: orders are recorded locally in your browser." },
      { status: 503 },
    );
  }
  const parsed = orderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order payload." }, { status: 400 });
  }
  const { config, material, sizeInches, designId } = parsed.data;

  // Server-side sacred-rules gate: a config that violates iconography rules
  // cannot be ordered, no matter what client sent it (PRD §8.2/§8.3).
  const violations = validateConfig(config, CATALOG, rulesForDeity(config.deityId));
  if (violations.length > 0) {
    return NextResponse.json(
      {
        error: "This design violates iconography rules and cannot be ordered.",
        violations: violations.map((v) => ({ slotId: v.slotId, reason: v.reason })),
      },
      { status: 422 },
    );
  }

  const supabase = createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Sign in to place an order." }, { status: 401 });
  }

  const priceInr = price(config, material, sizeInches, partsForDeity(config.deityId));
  const orderId = newOrderId();

  // ==========================================================================
  // RAZORPAY INTEGRATION POINT (M1 — deliberately not implemented in M0).
  //
  //   1. const rp = new Razorpay({ key_id, key_secret })            [server env]
  //   2. const rpOrder = await rp.orders.create({
  //        amount: priceInr * 100, currency: "INR", receipt: orderId })
  //   3. store rpOrder.id in razorpay_order_id, status = 'awaiting_payment'
  //   4. return rpOrder.id -> client opens Razorpay Checkout (UPI/cards)
  //   5. webhook /api/razorpay/webhook verifies signature, flips status
  //      to 'processing' and triggers the mesh-bake pipeline (PRD §9)
  // ==========================================================================

  const { error } = await supabase.from("orders").insert({
    id: orderId,
    user_id: auth.user.id,
    design_id: designId ?? null,
    design_config: config,
    material,
    size_inches: sizeInches,
    price_inr: priceInr,
    status: "stub_created",
    razorpay_order_id: null,
  });
  if (error) {
    return NextResponse.json({ error: "Could not record order." }, { status: 500 });
  }
  return NextResponse.json({ orderId, priceInr, status: "stub_created" });
}
