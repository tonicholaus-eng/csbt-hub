import test from "node:test";
import assert from "node:assert/strict";

import fullTradingItems from "../src/data/tradingItems.json";
import { getGameAdapter, buildCalculatorHref, parseGameId, parseGameScope } from "../src/games/registry";
import type { TradeItem, ValueSource, ValueType } from "../src/components/trade/types";

const adopt = getGameAdapter("adopt-me");
const full = fullTradingItems as TradeItem[];
const fullById = new Map(full.map((item) => [item.ID, item]));

const SOURCES: ValueSource[] = ["GCASH", "ELVE"];
const VARIANTS: ValueType[] = ["NORMAL", "NEON", "MEGA"];

function fullValue(item: TradeItem, source: ValueSource, variant: ValueType): number | null {
  // Mirrors the adapter's resolution order, including the legacy aliases the
  // compact index omits, so the comparison is apples to apples.
  const direct = item[`${source}_${variant}` as keyof TradeItem];
  if (typeof direct === "number" && Number.isFinite(direct)) return direct;
  if (source === "GCASH") {
    const legacy = item[variant as keyof TradeItem];
    if (typeof legacy === "number" && Number.isFinite(legacy)) return legacy;
  }
  if (source === "ELVE" && variant === "NORMAL") {
    const legacy = item.INGAME_VALUE;
    if (typeof legacy === "number" && Number.isFinite(legacy)) return legacy;
  }
  return null;
}

// ---------------------------------------------------------------------------
// The registry now reads the COMPACT client index instead of the full 1.7 MB
// tradingItems.json (E3). These tests pin that swap: if the compact index ever
// stops carrying a field the adapter needs, a value changes here first.
// ---------------------------------------------------------------------------

test("the registry exposes every Adopt Me item from the full dataset", () => {
  assert.equal(adopt.items.length, full.length);
  for (const item of adopt.items) {
    assert.ok(fullById.has(item.id), `registry has unknown item ${item.id}`);
  }
});

test("registry values match the full dataset for every item, source and variant", () => {
  let compared = 0;
  const mismatches: string[] = [];

  for (const registryItem of adopt.items) {
    const source = fullById.get(registryItem.id);
    assert.ok(source, `missing ${registryItem.id}`);

    for (const valueSource of SOURCES) {
      for (const variant of VARIANTS) {
        const expected = fullValue(source, valueSource, variant);
        const actual = adopt.getValue(registryItem, valueSource, variant);
        compared += 1;
        if (expected !== actual && mismatches.length < 10) {
          mismatches.push(
            `${source.NAME} ${valueSource}/${variant}: full=${expected} registry=${actual}`,
          );
        }
      }
    }
  }

  assert.deepEqual(mismatches, [], `value drift between compact index and full dataset`);
  // 3,382 items x 2 sources x 3 variants
  assert.equal(compared, full.length * SOURCES.length * VARIANTS.length);
});

test("registry variant availability matches the full dataset", () => {
  for (const registryItem of adopt.items.slice(0, 800)) {
    const source = fullById.get(registryItem.id);
    assert.ok(source);
    for (const valueSource of SOURCES) {
      const expected = VARIANTS.filter((variant) => fullValue(source, valueSource, variant) !== null);
      const actual = adopt.getVariants(registryItem, valueSource);
      // The adapter falls back to ["NORMAL"] when nothing is priced.
      assert.deepEqual(
        actual,
        expected.length ? expected : ["NORMAL"],
        `${source.NAME} ${valueSource} variants`,
      );
    }
  }
});

test("an unpriced item reports null rather than zero", () => {
  const unpriced = adopt.items.find((item) => {
    const source = fullById.get(item.id);
    return source ? fullValue(source, "ELVE", "MEGA") === null : false;
  });
  assert.ok(unpriced, "expected at least one item with no ELVE mega value");
  assert.equal(adopt.getValue(unpriced, "ELVE", "MEGA"), null);
});

// ---------------------------------------------------------------------------
// Game scoping helpers
// ---------------------------------------------------------------------------

test("parseGameId accepts known ids and the legacy 'adopt' alias", () => {
  assert.equal(parseGameId("mm2"), "mm2");
  assert.equal(parseGameId("adopt-me"), "adopt-me");
  assert.equal(parseGameId("adopt"), "adopt-me");
  assert.equal(parseGameId(null), "adopt-me");
  assert.equal(parseGameId("nonsense"), "adopt-me");
  assert.equal(parseGameId("nonsense", "mm2"), "mm2");
});

test("parseGameScope supports the all-games scope", () => {
  assert.equal(parseGameScope("all"), "all");
  assert.equal(parseGameScope("mm2"), "mm2");
  assert.equal(parseGameScope(null), "adopt-me");
});

test("calculator hrefs stay on each game's own route", () => {
  const adoptHref = buildCalculatorHref(
    "adopt-me",
    { your: [{ itemId: "pet-2d-doggy", variant: "NORMAL", quantity: 2 }], their: [] },
    "GCASH",
  );
  assert.ok(adoptHref.startsWith("/calculator?"));
  assert.ok(adoptHref.includes("source=GCASH"));
  assert.ok(!adoptHref.includes("/mm2"));

  const mm2Href = buildCalculatorHref(
    "mm2",
    { your: [{ itemId: "mm2-rainbow-gun-godly", quantity: 3 }], their: [] },
    "SUPREME",
  );
  assert.ok(mm2Href.startsWith("/mm2/calculator?"));
  assert.ok(mm2Href.includes("source=SUPREME"));
});

test("each game only offers its own value sources", () => {
  assert.deepEqual(adopt.valueSources.map((s) => s.id).sort(), ["ELVE", "GCASH"]);
  assert.deepEqual(getGameAdapter("mm2").valueSources.map((s) => s.id), ["SUPREME"]);
});

test("MM2 exposes no Adopt Me variants", () => {
  const mm2 = getGameAdapter("mm2");
  const item = mm2.items[0];
  assert.deepEqual(mm2.getVariants(item, "SUPREME"), ["NORMAL"]);
});

test("Adopt Me profile hrefs stay off the MM2 routes", () => {
  const item = adopt.items[0];
  const href = adopt.itemProfileHref(item);
  assert.ok(href.startsWith("/values/"));
  assert.ok(!href.includes("/mm2"));
});
