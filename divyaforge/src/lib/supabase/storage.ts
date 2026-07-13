"use client";

import type { DesignConfig, MaterialId, SizeInches } from "@/lib/schema/config";
import { parseDesignConfig } from "@/lib/schema/config";
import { CATALOG, partsForDeity, rulesForDeity } from "@/lib/catalog";
import { validateConfig } from "@/lib/constraints/engine";
import { price } from "@/lib/pricing/engine";
import { encodeInlineConfigId } from "@/lib/share/codec";
import { getBrowserSupabase, isSupabaseConfigured } from "./client";

/**
 * Storage adapter — the single seam between the UI and persistence.
 *
 * Supabase mode: writes go through /api/* route handlers so the sacred-rules
 * engine validates server-side (PRD §8.2 — the client is never trusted).
 *
 * Demo (local) mode: no env vars needed; designs/orders live in
 * localStorage and share links carry the config inline. Same UI code paths.
 */

export type StorageMode = "supabase" | "local";

export function getStorageMode(): StorageMode {
  return isSupabaseConfigured() ? "supabase" : "local";
}

export interface SavedDesign {
  id: string;
  name: string;
  config: DesignConfig;
  updatedAt: string;
  /** id to put in the /d/ share URL. */
  shareId: string;
}

export interface OrderResult {
  orderId: string;
  priceInr: number;
  status: string;
}

export interface CurrentUser {
  id: string;
  email: string | null;
  isLocal: boolean;
}

const LS_DESIGNS = "divyaforge_designs";
const LS_ORDERS = "divyaforge_orders";

function lsRead<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function lsWrite<T>(key: string, rows: T[]) {
  window.localStorage.setItem(key, JSON.stringify(rows));
}

function newLocalId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

/** Client-side constraint gate — the server repeats this in Supabase mode. */
function assertValidConfig(config: DesignConfig) {
  parseDesignConfig(config);
  const violations = validateConfig(config, CATALOG, rulesForDeity(config.deityId));
  if (violations.length > 0) {
    throw new Error(
      `This design violates iconography rules: ${violations
        .map((v) => v.reason.en)
        .join(" ")}`,
    );
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (getStorageMode() === "local") {
    return { id: "local-guest", email: null, isLocal: true };
  }
  const { data } = await getBrowserSupabase().auth.getUser();
  if (!data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null, isLocal: false };
}

export async function signOut(): Promise<void> {
  if (getStorageMode() === "supabase") {
    await getBrowserSupabase().auth.signOut();
  }
}

export async function saveDesign(
  name: string,
  config: DesignConfig,
  existingId?: string | null,
): Promise<SavedDesign> {
  assertValidConfig(config);
  const trimmed = name.trim() || "Untitled murti";

  if (getStorageMode() === "local") {
    const rows = lsRead<SavedDesign>(LS_DESIGNS);
    const id = existingId ?? newLocalId("local");
    const record: SavedDesign = {
      id,
      name: trimmed,
      config,
      updatedAt: new Date().toISOString(),
      shareId: encodeInlineConfigId(config),
    };
    const next = rows.filter((r) => r.id !== id);
    next.unshift(record);
    lsWrite(LS_DESIGNS, next);
    return record;
  }

  const { id } = await api<{ id: string }>("/api/designs", {
    method: "POST",
    body: JSON.stringify({ id: existingId ?? undefined, name: trimmed, config }),
  });
  return {
    id,
    name: trimmed,
    config,
    updatedAt: new Date().toISOString(),
    shareId: id,
  };
}

export async function listDesigns(): Promise<SavedDesign[]> {
  if (getStorageMode() === "local") {
    return lsRead<SavedDesign>(LS_DESIGNS);
  }
  const { designs } = await api<{
    designs: { id: string; name: string; config: unknown; updated_at: string }[];
  }>("/api/designs");
  return designs.map((d) => ({
    id: d.id,
    name: d.name,
    config: parseDesignConfig(d.config),
    updatedAt: d.updated_at,
    shareId: d.id,
  }));
}

export async function getDesign(id: string): Promise<SavedDesign | null> {
  if (getStorageMode() === "local") {
    return lsRead<SavedDesign>(LS_DESIGNS).find((r) => r.id === id) ?? null;
  }
  try {
    const { design } = await api<{
      design: { id: string; name: string; config: unknown; updated_at: string };
    }>(`/api/designs/${encodeURIComponent(id)}`);
    return {
      id: design.id,
      name: design.name,
      config: parseDesignConfig(design.config),
      updatedAt: design.updated_at,
      shareId: design.id,
    };
  } catch {
    return null;
  }
}

export async function deleteDesign(id: string): Promise<void> {
  if (getStorageMode() === "local") {
    lsWrite(LS_DESIGNS, lsRead<SavedDesign>(LS_DESIGNS).filter((r) => r.id !== id));
    return;
  }
  await api(`/api/designs/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function createOrder(
  config: DesignConfig,
  material: MaterialId,
  sizeInches: SizeInches,
): Promise<OrderResult> {
  assertValidConfig(config);

  if (getStorageMode() === "local") {
    const priceInr = price(config, material, sizeInches, partsForDeity(config.deityId));
    const order = {
      orderId: newLocalId("order"),
      priceInr,
      status: "stub_created",
      material,
      sizeInches,
      config,
      createdAt: new Date().toISOString(),
    };
    const rows = lsRead<typeof order>(LS_ORDERS);
    rows.unshift(order);
    lsWrite(LS_ORDERS, rows);
    return { orderId: order.orderId, priceInr, status: order.status };
  }

  return api<OrderResult>("/api/orders", {
    method: "POST",
    body: JSON.stringify({ config, material, sizeInches }),
  });
}
