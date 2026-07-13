import { describe, expect, it } from "vitest";
import { defaultConfig } from "@/lib/schema/defaults";
import {
  decodeInlineConfigId,
  encodeInlineConfigId,
  isInlineConfigId,
  shareUrl,
} from "./codec";

describe("share codec", () => {
  it("round-trips a config (including Devanagari-adjacent unicode) losslessly", () => {
    const config = defaultConfig();
    const id = encodeInlineConfigId(config);
    expect(isInlineConfigId(id)).toBe(true);
    expect(decodeInlineConfigId(id)).toEqual(config);
  });

  it("is URL-safe (no +, /, =, or ?)", () => {
    const id = encodeInlineConfigId(defaultConfig());
    expect(id).toMatch(/^cfg_[A-Za-z0-9_-]+$/);
  });

  it("returns null for tampered or malformed ids instead of throwing", () => {
    expect(decodeInlineConfigId("cfg_not-valid-base64!!!")).toBeNull();
    expect(decodeInlineConfigId("cfg_aGVsbG8")).toBeNull(); // valid b64, not a config
    expect(decodeInlineConfigId("shortcode123")).toBeNull(); // not inline at all
  });

  it("rejects configs that fail schema validation after decode", () => {
    const bad = { ...defaultConfig(), material: "gold-plated" };
    const json = JSON.stringify(bad);
    const b64 = btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(decodeInlineConfigId("cfg_" + b64)).toBeNull();
  });

  it("builds share URLs from an explicit origin", () => {
    expect(shareUrl("abc123", "https://divyaforge.example")).toBe(
      "https://divyaforge.example/d/abc123",
    );
  });
});
