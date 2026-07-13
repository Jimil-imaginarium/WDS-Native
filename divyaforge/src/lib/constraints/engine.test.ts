import { describe, expect, it } from "vitest";
import { CATALOG, getDeity, getPart, partsForDeity, rulesForDeity, SLOTS } from "@/lib/catalog";
import type { DeityDef, PartDef } from "@/lib/catalog/types";
import { defaultConfig } from "@/lib/schema/defaults";
import { canEquip, partsWithDecisions, validateConfig } from "./engine";
import { divineInspiration } from "./inspiration";

const deity = getDeity("ganesh")!;
const rules = rulesForDeity("ganesh");
const parts = partsForDeity("ganesh");

const ankusha = getPart("ankusha")!;
const pasha = getPart("pasha")!;
const modak = getPart("modak")!;
const lotus = getPart("lotus-flower")!;
const dhoti = getPart("dhoti-classic")!;

function fourArmConfig() {
  const config = defaultConfig();
  config.body.armCount = 4;
  config.parts.handR2 = null;
  config.parts.handL2 = null;
  return config;
}

/** Deterministic PRNG so Divine Inspiration tests are reproducible. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("canEquip — structural checks", () => {
  it("rejects a part placed in the wrong slot family", () => {
    const d = canEquip({ deity, config: defaultConfig(), part: dhoti, slot: SLOTS.handR1, rules });
    expect(d.allowed).toBe(false);
  });

  it("rejects a part belonging to another deity", () => {
    const foreign: PartDef = { ...modak, id: "murli", deityId: "krishna", constraintTags: [] };
    const d = canEquip({ deity, config: defaultConfig(), part: foreign, slot: SLOTS.handL1, rules });
    expect(d.allowed).toBe(false);
  });

  it("accepts a universal (deityId null) part", () => {
    const d = canEquip({ deity, config: defaultConfig(), part: lotus, slot: SLOTS.handR1, rules });
    expect(d.allowed).toBe(true);
  });
});

describe("canEquip — sacred rules (seed data)", () => {
  it("allows ankusha only in right hands", () => {
    const config = defaultConfig();
    expect(canEquip({ deity, config, part: ankusha, slot: SLOTS.handR1, rules }).allowed).toBe(true);
    const left = canEquip({ deity, config, part: ankusha, slot: SLOTS.handL1, rules });
    expect(left.allowed).toBe(false);
    if (!left.allowed) {
      expect(left.ruleId).toBe("ganesh-ankusha-right-hand");
      expect(left.reason.en).toMatch(/right hand/i);
      expect(left.reason.hi.length).toBeGreaterThan(0);
    }
  });

  it("allows pasha only in left hands", () => {
    const config = defaultConfig();
    config.parts.handL1 = null;
    expect(canEquip({ deity, config, part: pasha, slot: SLOTS.handL1, rules }).allowed).toBe(true);
    expect(canEquip({ deity, config, part: pasha, slot: SLOTS.handR1, rules }).allowed).toBe(false);
  });

  it("allows modak only in left hands", () => {
    const config = defaultConfig();
    expect(canEquip({ deity, config, part: modak, slot: SLOTS.handR1, rules }).allowed).toBe(false);
  });

  it("limits unique items to a single instance across hands", () => {
    const config = fourArmConfig();
    config.parts.handR1 = "ankusha";
    const dup = canEquip({ deity, config, part: ankusha, slot: SLOTS.handR2, rules });
    expect(dup.allowed).toBe(false);
    if (!dup.allowed) expect(dup.ruleId).toBe("unique-items-once");
  });

  it("re-equipping the same unique item into its own slot is allowed (replace, not duplicate)", () => {
    const config = fourArmConfig();
    config.parts.handR1 = "ankusha";
    expect(canEquip({ deity, config, part: ankusha, slot: SLOTS.handR1, rules }).allowed).toBe(true);
  });

  it("non-unique items (modak) may appear in several left hands", () => {
    const config = fourArmConfig();
    config.parts.handL1 = "modak";
    expect(canEquip({ deity, config, part: modak, slot: SLOTS.handL2, rules }).allowed).toBe(true);
  });

  it("denies fierce-tagged items on a saumya deity, allows them elsewhere", () => {
    const khadga: PartDef = {
      ...lotus,
      id: "khadga",
      deityId: null,
      constraintTags: ["fierce"],
    };
    const onGanesh = canEquip({
      deity, config: defaultConfig(), part: khadga, slot: SLOTS.handR1, rules,
    });
    expect(onGanesh.allowed).toBe(false);
    if (!onGanesh.allowed) expect(onGanesh.ruleId).toBe("no-fierce-items-on-saumya");

    const fierceDeity: DeityDef = { ...deity, id: "durga-test", styleTags: ["ugra"] };
    const fierceRules = CATALOG.constraints.filter(
      (r) => r.deityId === null || r.deityId === fierceDeity.id,
    );
    expect(
      canEquip({
        deity: fierceDeity, config: defaultConfig(), part: khadga, slot: SLOTS.handR1,
        rules: fierceRules,
      }).allowed,
    ).toBe(true);
  });
});

describe("partsWithDecisions (UI grid feed)", () => {
  it("returns every hand part with a decision, denied ones carrying reasons", () => {
    const result = partsWithDecisions({
      deity, config: defaultConfig(), slot: SLOTS.handR1, parts, rules,
    });
    const ids = result.map((r) => r.part.id).sort();
    expect(ids).toEqual(["ankusha", "lotus-flower", "modak", "pasha"]);
    const modakRow = result.find((r) => r.part.id === "modak")!;
    expect(modakRow.decision.allowed).toBe(false);
  });
});

describe("validateConfig — server-side gate", () => {
  it("passes the respectful default design", () => {
    expect(validateConfig(defaultConfig(), CATALOG, rules)).toEqual([]);
  });

  it("flags an empty required slot (modesty rule: lower garment)", () => {
    const config = defaultConfig();
    config.parts.vastraLower = null;
    const v = validateConfig(config, CATALOG, rules);
    expect(v).toHaveLength(1);
    expect(v[0].slotId).toBe("vastraLower");
  });

  it("flags a part parked in a slot the body no longer has", () => {
    const config = defaultConfig(); // two arms
    config.parts.handR2 = "lotus-flower";
    const v = validateConfig(config, CATALOG, rules);
    expect(v.some((x) => x.slotId === "handR2")).toBe(true);
  });

  it("flags rule violations injected directly into the config JSON", () => {
    const config = defaultConfig();
    config.parts.handR1 = "modak"; // right hand — violates ganesh-modak-left-hand
    const v = validateConfig(config, CATALOG, rules);
    expect(v.some((x) => x.ruleId === "ganesh-modak-left-hand")).toBe(true);
  });

  it("flags unknown part ids", () => {
    const config = defaultConfig();
    config.parts.handR1 = "not-a-part";
    expect(validateConfig(config, CATALOG, rules).length).toBeGreaterThan(0);
  });
});

describe("multi-deity catalog (Krishna)", () => {
  const krishna = getDeity("krishna")!;
  const kRules = rulesForDeity("krishna");
  const kParts = partsForDeity("krishna");

  it("krishna's respectful default validates clean", () => {
    expect(validateConfig(defaultConfig("krishna"), CATALOG, kRules)).toEqual([]);
  });

  it("ganesh-only parts are not equippable on krishna (and vice versa)", () => {
    const config = defaultConfig("krishna");
    expect(canEquip({ deity: krishna, config, part: modak, slot: SLOTS.handL1, rules: kRules }).allowed).toBe(false);
    const gConfig = defaultConfig();
    const bansuri = getPart("bansuri")!;
    expect(canEquip({ deity, config: gConfig, part: bansuri, slot: SLOTS.handR1, rules }).allowed).toBe(false);
  });

  it("makhan matki is left-hand only", () => {
    const config = defaultConfig("krishna");
    const makhan = getPart("makhan-matki")!;
    expect(canEquip({ deity: krishna, config, part: makhan, slot: SLOTS.handL1, rules: kRules }).allowed).toBe(true);
    const right = canEquip({ deity: krishna, config, part: makhan, slot: SLOTS.handR1, rules: kRules });
    expect(right.allowed).toBe(false);
    if (!right.allowed) expect(right.ruleId).toBe("krishna-makhan-left-hand");
  });

  it("divine inspiration stays constraint-clean for krishna across 100 seeded runs", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const result = divineInspiration(
        defaultConfig("krishna"), krishna, kParts, kRules, mulberry32(seed),
      );
      expect(validateConfig(result, CATALOG, kRules)).toEqual([]);
      for (const [slotId, partId] of Object.entries(result.parts)) {
        if (partId === "makhan-matki") expect(slotId.startsWith("handL")).toBe(true);
      }
    }
  });
});

describe("divineInspiration — randomizes only within allowed combinations", () => {
  it("produces constraint-clean configs across 200 seeded runs", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const result = divineInspiration(
        defaultConfig(), deity, parts, rules, mulberry32(seed),
      );
      expect(validateConfig(result, CATALOG, rules)).toEqual([]);
      // The randomizer must never move ankusha/pasha to the wrong side even
      // transiently: check sides explicitly.
      for (const [slotId, partId] of Object.entries(result.parts)) {
        if (partId === "ankusha") expect(slotId.startsWith("handR")).toBe(true);
        if (partId === "pasha" || partId === "modak") {
          expect(slotId.startsWith("handL")).toBe(true);
        }
      }
    }
  });

  it("never changes deity, material, or size", () => {
    const base = defaultConfig();
    base.material = "full-color";
    base.sizeInches = 8;
    const result = divineInspiration(base, deity, parts, rules, mulberry32(7));
    expect(result.deityId).toBe(base.deityId);
    expect(result.material).toBe("full-color");
    expect(result.sizeInches).toBe(8);
  });

  it("is deterministic for a given seed", () => {
    const a = divineInspiration(defaultConfig(), deity, parts, rules, mulberry32(42));
    const b = divineInspiration(defaultConfig(), deity, parts, rules, mulberry32(42));
    expect(a).toEqual(b);
  });
});
