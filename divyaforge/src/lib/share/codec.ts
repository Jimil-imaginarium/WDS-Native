import {
  parseDesignConfig,
  type DesignConfig,
} from "@/lib/schema/config";

/**
 * Share-link codec. Two id families live under /d/[configId]:
 *
 *   cfg_<base64url(json)>  — inline config ids: self-contained, work with no
 *                            backend at all (demo mode, "copy link" pre-save).
 *   <shortcode>            — Postgres `designs.id` rows (Supabase mode).
 *
 * Both load the exact design read-only with a "Customize this" fork button.
 */

const INLINE_PREFIX = "cfg_";

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function encodeInlineConfigId(config: DesignConfig): string {
  const json = JSON.stringify(config);
  return INLINE_PREFIX + toBase64Url(new TextEncoder().encode(json));
}

export function isInlineConfigId(configId: string): boolean {
  return configId.startsWith(INLINE_PREFIX);
}

/**
 * Decode + schema-validate an inline config id.
 * Returns null for anything malformed — never throws on user-supplied URLs.
 */
export function decodeInlineConfigId(configId: string): DesignConfig | null {
  if (!isInlineConfigId(configId)) return null;
  try {
    const json = new TextDecoder().decode(
      fromBase64Url(configId.slice(INLINE_PREFIX.length)),
    );
    return parseDesignConfig(JSON.parse(json));
  } catch {
    return null;
  }
}

export function shareUrl(configId: string, origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
  return `${base}/d/${configId}`;
}
