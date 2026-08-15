import test from "node:test";
import assert from "node:assert/strict";
import { detectValueSource, formatTradeValue, getItemValue, parseTradeValue } from "../src/lib/valueSystem";
import type { TradeItem } from "../src/components/trade/types";

test("parseTradeValue handles numbers, formatted strings and ranges", () => {
  assert.equal(parseTradeValue(310), 310);
  assert.equal(parseTradeValue("1,465"), 1465);
  assert.equal(parseTradeValue("10-15"), 10);
  assert.equal(parseTradeValue(null), null);
  assert.equal(parseTradeValue("N/A"), null);
});

test("value source detection understands CSBT language", () => {
  assert.equal(detectValueSource("check this in gcash"), "GCASH");
  assert.equal(detectValueSource("use elvebredd shark values"), "ELVE");
  assert.equal(detectValueSource("in game value please"), "ELVE");
});

test("getItemValue keeps GCash and Elve systems separate", () => {
  const item = { ID: "x", NAME: "Test", CATEGORY: "PET", IMAGE: "", GCASH_NORMAL: 50, ELVE_NORMAL: 12 } as TradeItem;
  assert.equal(getItemValue(item, "GCASH", "NORMAL"), 50);
  assert.equal(getItemValue(item, "ELVE", "NORMAL"), 12);
  assert.equal(formatTradeValue(getItemValue(item, "GCASH", "NORMAL")), "50");
});
