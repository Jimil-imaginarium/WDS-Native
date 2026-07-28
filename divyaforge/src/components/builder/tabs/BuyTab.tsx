"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MATERIAL_IDS, SIZES_INCHES } from "@/lib/schema/config";
import { partsForDeity } from "@/lib/catalog";
import { formatInr, MATERIALS, priceBreakdown } from "@/lib/pricing/engine";
import {
  createOrder,
  getCurrentUser,
  getStorageMode,
  type CurrentUser,
  type OrderResult,
} from "@/lib/supabase/storage";
import { useBuilderStore } from "@/store/builderStore";
import { SectionLabel } from "@/components/ui/SectionLabel";

export function BuyTab() {
  const config = useBuilderStore((s) => s.config);
  const setMaterial = useBuilderStore((s) => s.setMaterial);
  const setSize = useBuilderStore((s) => s.setSize);

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mode = getStorageMode();

  useEffect(() => {
    getCurrentUser().then((u) => {
      setUser(u);
      setUserLoaded(true);
    });
  }, []);

  const parts = partsForDeity(config.deityId);
  const breakdown = priceBreakdown(config, config.material, config.sizeInches, parts);

  async function handleCheckout() {
    setBusy(true);
    setError(null);
    try {
      setOrder(await createOrder(config, config.material, config.sizeInches));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not place order.");
    } finally {
      setBusy(false);
    }
  }

  if (order) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4">
        <h3 className="text-sm font-bold text-green-900">Order recorded 🎉</h3>
        <p className="mt-1 text-sm text-green-800">
          Order <span className="font-mono font-semibold">{order.orderId}</span> ·{" "}
          {formatInr(order.priceInr)}
        </p>
        <p className="mt-2 text-xs text-green-700">
          Status: <span className="font-semibold">{order.status}</span>. This is
          the M0 checkout stub — payment (Razorpay UPI/cards) and the
          production pipeline connect at the marked integration point in a
          later milestone.
        </p>
        <button
          type="button"
          onClick={() => setOrder(null)}
          className="mt-3 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-semibold text-green-800"
        >
          Back to Buy
        </button>
      </div>
    );
  }

  const needsSignIn = mode === "supabase" && userLoaded && !user;

  return (
    <div>
      <SectionLabel en="Material" hi="सामग्री" />
      <div className="space-y-2">
        {MATERIAL_IDS.map((id) => {
          const mat = MATERIALS[id];
          const selected = config.material === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMaterial(id)}
              className={[
                "flex w-full items-center justify-between rounded-xl border p-3 text-left transition",
                selected
                  ? "border-saffron-500 bg-saffron-50 ring-2 ring-saffron-400"
                  : "border-stone-200 bg-white hover:border-saffron-300",
              ].join(" ")}
            >
              <span>
                <span className="block text-sm font-semibold text-stone-800">
                  {mat.name.en}
                </span>
                <span className="block text-[11px] text-stone-500">
                  {mat.description.en}
                </span>
              </span>
              <span className="ml-2 shrink-0 text-xs text-stone-500">
                from {formatInr(mat.basePriceInr)}
              </span>
            </button>
          );
        })}
      </div>

      <SectionLabel en="Size" hi="आकार" />
      <div className="grid grid-cols-3 gap-2">
        {SIZES_INCHES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSize(s)}
            className={[
              "rounded-xl border px-3 py-2 text-sm font-medium transition",
              config.sizeInches === s
                ? "border-saffron-500 bg-saffron-50 ring-2 ring-saffron-400"
                : "border-stone-200 bg-white hover:border-saffron-300",
            ].join(" ")}
          >
            {s}″
          </button>
        ))}
      </div>

      <SectionLabel en="Price" hi="मूल्य" hint="Updates live with every edit." />
      <dl className="space-y-1 rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-600">
        <div className="flex justify-between">
          <dt>{MATERIALS[config.material].name.en} base</dt>
          <dd className="tabular-nums">{formatInr(breakdown.baseInr)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Figure volume ({Math.round(breakdown.volumeUnits)} u³)</dt>
          <dd className="tabular-nums">{formatInr(breakdown.volumeChargeInr)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Parts & detail ({breakdown.partVolumeUnits} u)</dt>
          <dd className="tabular-nums">{formatInr(breakdown.partsChargeInr)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Size multiplier ({config.sizeInches}″)</dt>
          <dd className="tabular-nums">× {breakdown.sizeMultiplier}</dd>
        </div>
        <div className="mt-1 flex justify-between border-t border-stone-200 pt-2 text-base font-bold text-stone-900">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatInr(breakdown.totalInr)}</dd>
        </div>
      </dl>
      <p className="mt-1 text-[11px] text-stone-400">
        Tip: smaller size or fewer items lowers the price.
      </p>

      {needsSignIn ? (
        <Link
          href="/login?next=/builder"
          className="mt-3 block w-full rounded-xl bg-stone-800 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-stone-700"
        >
          Sign in to order
        </Link>
      ) : (
        <button
          type="button"
          onClick={handleCheckout}
          disabled={busy}
          className="mt-3 w-full rounded-xl bg-maroon-700 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-maroon-800 disabled:opacity-50"
        >
          {busy ? "Recording order…" : `Order — ${formatInr(breakdown.totalInr)}`}
        </button>
      )}
      <p className="mt-1.5 text-[11px] text-stone-400">
        M0 stub: records the order without payment. Razorpay (UPI/cards)
        integration point is marked in <code>/api/orders</code>.
      </p>
      {error && <p className="mt-2 text-xs font-medium text-maroon-700">{error}</p>}
    </div>
  );
}
