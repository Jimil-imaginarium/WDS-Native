import { describe, expect, it } from "vitest";
import { partsForDeity } from "@/lib/catalog";
import { defaultConfig } from "@/lib/schema/defaults";
import {
  equippedPartsVolume,
  estimateBoundingVolume,
  formatInr,
  price,
  priceBreakdown,
  round9,
  SIZE_MULTIPLIERS,
} from "./engine";

const parts = partsForDeity("ganesh");

describe("round9", () => {
  it("rounds up to the next ₹…9 ending", () => {
    expect(round9(1801)).toBe(1809);
    expect(round9(1809)).toBe(1809);
    expect(round9(1810)).toBe(1819);
    expect(round9(4368.65)).toBe(4369);
  });
});

describe("estimateBoundingVolume", () => {
  it("grows with height and weight sliders", () => {
    const config = defaultConfig();
    const base = estimateBoundingVolume(config, parts);
    config.body.height = 1;
    const taller = estimateBoundingVolume(config, parts);
    config.body.weight = 1;
    const heavier = estimateBoundingVolume(config, parts);
    expect(taller).toBeGreaterThan(base);
    expect(heavier).toBeGreaterThan(taller);
  });

  it("four arms widen the bounding box", () => {
    const config = defaultConfig();
    const two = estimateBoundingVolume(config, parts);
    config.body.armCount = 4;
    expect(estimateBoundingVolume(config, parts)).toBeGreaterThan(two);
  });

  it("an equipped base adds volume", () => {
    const config = defaultConfig();
    const withBase = estimateBoundingVolume(config, parts);
    config.parts.base = null;
    expect(estimateBoundingVolume(config, parts)).toBeLessThan(withBase);
  });
});

describe("equippedPartsVolume", () => {
  it("sums priceVolume of equipped parts only", () => {
    // default: dhoti-classic (3) + modak (1) + lotus-peetha (8)
    expect(equippedPartsVolume(defaultConfig(), parts)).toBe(12);
  });

  it("ignores unknown ids and empty slots", () => {
    const config = defaultConfig();
    config.parts.handR1 = null;
    config.parts.handL1 = "does-not-exist";
    expect(equippedPartsVolume(config, parts)).toBe(11);
  });
});

describe("price — exact values for the pinned M0 constants", () => {
  // These assert the exact published pricing behavior. If pricing constants
  // are deliberately tuned, update these snapshots in the same commit.
  it("default design (4″): Standard ₹1,859 · Premium ₹3,069 · Full-Color ₹4,859", () => {
    const config = defaultConfig();
    expect(price(config, "standard-resin", 4, parts)).toBe(1859);
    expect(price(config, "premium-resin", 4, parts)).toBe(3069);
    expect(price(config, "full-color", 4, parts)).toBe(4859);
  });

  it("default design Standard Resin 8″ = ₹4,369", () => {
    expect(price(defaultConfig(), "standard-resin", 8, parts)).toBe(4369);
  });
});

describe("price — properties", () => {
  it("is strictly monotonic in size", () => {
    const config = defaultConfig();
    const p4 = price(config, "standard-resin", 4, parts);
    const p6 = price(config, "standard-resin", 6, parts);
    const p8 = price(config, "standard-resin", 8, parts);
    expect(p6).toBeGreaterThan(p4);
    expect(p8).toBeGreaterThan(p6);
  });

  it("is strictly monotonic across the material ladder", () => {
    const config = defaultConfig();
    const std = price(config, "standard-resin", 4, parts);
    const prem = price(config, "premium-resin", 4, parts);
    const color = price(config, "full-color", 4, parts);
    expect(prem).toBeGreaterThan(std);
    expect(color).toBeGreaterThan(prem);
  });

  it("adding a part never lowers the price (live 'every edit' updates)", () => {
    const config = defaultConfig();
    const before = price(config, "premium-resin", 6, parts);
    config.parts.handR1 = "ankusha";
    const after = price(config, "premium-resin", 6, parts);
    expect(after).toBeGreaterThan(before);
  });

  it("size multipliers are sub-cubic (8″ costs less than 2× a 4″ per formula)", () => {
    expect(SIZE_MULTIPLIERS[8]).toBeLessThan(8 ** 3 / 4 ** 3); // « volume ratio
    expect(SIZE_MULTIPLIERS[8]).toBeGreaterThan(SIZE_MULTIPLIERS[6]);
  });

  it("every price ends in 9 (merchandising rule)", () => {
    const config = defaultConfig();
    for (const material of ["standard-resin", "premium-resin", "full-color"] as const) {
      for (const size of [4, 6, 8] as const) {
        expect(price(config, material, size, parts) % 10).toBe(9);
      }
    }
  });

  it("breakdown components are exposed for the Buy tab and sum coherently", () => {
    const config = defaultConfig();
    const b = priceBreakdown(config, "standard-resin", 6, parts);
    expect(b.totalInr).toBe(
      round9((b.baseInr + b.volumeChargeInr + b.partsChargeInr) * b.sizeMultiplier),
    );
    expect(b.totalInr).toBe(price(config, "standard-resin", 6, parts));
  });
});

describe("formatInr", () => {
  it("formats with Indian digit grouping", () => {
    expect(formatInr(1859)).toBe("₹1,859");
    expect(formatInr(123456)).toBe("₹1,23,456");
  });
});
