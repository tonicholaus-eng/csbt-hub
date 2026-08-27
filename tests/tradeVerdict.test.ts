import test from "node:test";
import assert from "node:assert/strict";

import { FAIR_THRESHOLD_PERCENT, getTradeVerdict } from "../src/lib/trade/verdict";
import { getMM2TradeResult } from "../src/components/mm2/MM2TradeSummary";

// ---------------------------------------------------------------------------
// Empty / ready
// ---------------------------------------------------------------------------

test("an empty trade is READY, not FAIR", () => {
  const result = getTradeVerdict(0, 0);
  assert.equal(result.verdict, "READY");
  assert.equal(result.difference, 0);
});

test("zero totals with a missing item are CHECK, not READY", () => {
  assert.equal(getTradeVerdict(0, 0, { missingCount: 1 }).verdict, "CHECK");
});

// ---------------------------------------------------------------------------
// Missing values must never produce a confident verdict (audit B-14)
// ---------------------------------------------------------------------------

test("a missing value withholds the verdict even when the totals look decisive", () => {
  // Without the missing-value guard this is a runaway WIN.
  const result = getTradeVerdict(100, 100_000, { missingCount: 1 });
  assert.equal(result.verdict, "CHECK");
  assert.equal(result.missingCount, 1);
  // CHECK must not leak a difference that the UI could present as a result.
  assert.equal(result.difference, 0);
  assert.equal(result.differencePercent, 0);
});

test("a missing value outranks an otherwise perfectly fair trade", () => {
  assert.equal(getTradeVerdict(1000, 1000, { missingCount: 2 }).verdict, "CHECK");
});

test("missingCount is sanitised", () => {
  assert.equal(getTradeVerdict(10, 10, { missingCount: -5 }).verdict, "FAIR");
  assert.equal(getTradeVerdict(10, 10, { missingCount: 0 }).verdict, "FAIR");
  assert.equal(getTradeVerdict(10, 10, { missingCount: 1.9 }).missingCount, 1);
});

// ---------------------------------------------------------------------------
// The FAIR boundary
// ---------------------------------------------------------------------------

test("the FAIR threshold is inclusive at exactly 5 percent", () => {
  // their = 95, yours = 100 -> baseline 100, difference 5 -> exactly 5%
  const atBoundary = getTradeVerdict(100, 95);
  assert.equal(atBoundary.differencePercent, FAIR_THRESHOLD_PERCENT);
  assert.equal(atBoundary.verdict, "FAIR");
});

test("just inside and just outside the FAIR threshold", () => {
  assert.equal(getTradeVerdict(100, 95.5).verdict, "FAIR"); // 4.5%
  assert.equal(getTradeVerdict(100, 94).verdict, "LOSE"); // 6%
  assert.equal(getTradeVerdict(100, 106).verdict, "WIN"); // 5.66% of 106
});

test("identical totals are FAIR with a zero gap", () => {
  const result = getTradeVerdict(2500, 2500);
  assert.equal(result.verdict, "FAIR");
  assert.equal(result.difference, 0);
  assert.equal(result.differencePercent, 0);
});

// ---------------------------------------------------------------------------
// Direction
// ---------------------------------------------------------------------------

test("receiving more than you give is a WIN", () => {
  const result = getTradeVerdict(100, 200);
  assert.equal(result.verdict, "WIN");
  assert.equal(result.difference, 100);
  assert.equal(result.differencePercent, 50);
});

test("giving more than you receive is a LOSE", () => {
  const result = getTradeVerdict(200, 100);
  assert.equal(result.verdict, "LOSE");
  assert.equal(result.difference, 100);
});

test("a one-sided trade against you is a LOSE, not READY", () => {
  assert.equal(getTradeVerdict(500, 0).verdict, "LOSE");
});

test("a one-sided trade in your favour is a WIN", () => {
  assert.equal(getTradeVerdict(0, 500).verdict, "WIN");
});

// ---------------------------------------------------------------------------
// Hostile numbers
// ---------------------------------------------------------------------------

test("negative and non-finite totals are clamped rather than trusted", () => {
  assert.equal(getTradeVerdict(-100, -100).verdict, "READY");
  assert.equal(getTradeVerdict(Number.NaN, Number.NaN).verdict, "READY");
  assert.equal(getTradeVerdict(Number.POSITIVE_INFINITY, 0).verdict, "READY");
  const mixed = getTradeVerdict(-50, 100);
  assert.equal(mixed.verdict, "WIN");
  assert.equal(mixed.difference, 100);
});

test("tiny totals do not divide by zero", () => {
  const result = getTradeVerdict(0.0001, 0);
  assert.ok(Number.isFinite(result.differencePercent));
  assert.ok(result.differencePercent >= 0);
});

// ---------------------------------------------------------------------------
// Cross-game parity: the two calculators must never disagree
// ---------------------------------------------------------------------------

test("MM2 and the shared verdict agree across a sweep of totals", () => {
  const totals = [0, 1, 50, 95, 99, 100, 101, 105, 106, 500, 10_000];
  for (const yours of totals) {
    for (const theirs of totals) {
      const shared = getTradeVerdict(yours, theirs);
      const mm2 = getMM2TradeResult(yours, theirs, "SUPREME", 0);
      assert.equal(
        mm2.title,
        shared.verdict,
        `MM2 said ${mm2.title} but shared said ${shared.verdict} for ${yours} vs ${theirs}`,
      );
    }
  }
});

test("MM2 and the shared verdict agree that missing values mean CHECK", () => {
  for (const missing of [1, 3, 12]) {
    const shared = getTradeVerdict(100, 900, { missingCount: missing });
    const mm2 = getMM2TradeResult(100, 900, "SUPREME", missing);
    assert.equal(shared.verdict, "CHECK");
    assert.equal(mm2.title, "CHECK");
  }
});

test("the FAIR threshold constant is the one actually applied", () => {
  assert.equal(FAIR_THRESHOLD_PERCENT, 5);
  const justOver = getTradeVerdict(100, 100 - (FAIR_THRESHOLD_PERCENT + 0.1));
  assert.notEqual(justOver.verdict, "FAIR");
});
