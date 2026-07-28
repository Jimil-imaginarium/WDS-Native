import rawCatalog from "./data/catalog.json";
import type { CatalogData, ConstraintRule, DeityDef, PartDef } from "./types";

/**
 * Canonical catalog data. `data/catalog.json` is the single source of truth:
 * the app imports it here, and `scripts/generate-seed-sql.mjs` emits
 * supabase/seed.sql from the same file, so client, server, and DB can never
 * drift. In Supabase mode the DB rows are authoritative for server-side
 * validation; the bundled copy keeps the builder instant and demo mode alive.
 */
export const CATALOG: CatalogData = rawCatalog as CatalogData;

export function getDeity(deityId: string): DeityDef | undefined {
  return CATALOG.deities.find((d) => d.id === deityId);
}

export function getPart(partId: string): PartDef | undefined {
  return CATALOG.parts.find((p) => p.id === partId);
}

export function partsForTab(tab: string, deityId: string): PartDef[] {
  return CATALOG.parts.filter(
    (p) => p.tab === tab && (p.deityId === null || p.deityId === deityId),
  );
}

export function partsForDeity(deityId: string): PartDef[] {
  return CATALOG.parts.filter((p) => p.deityId === null || p.deityId === deityId);
}

export function rulesForDeity(deityId: string): ConstraintRule[] {
  return CATALOG.constraints.filter((r) => r.deityId === null || r.deityId === deityId);
}

export * from "./types";
export * from "./slots";
export * from "./palettes";
