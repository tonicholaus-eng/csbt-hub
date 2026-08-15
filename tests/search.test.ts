import test from "node:test";
import assert from "node:assert/strict";
import { getItemById, itemList, searchItems } from "../src/lib/search";

test("compact client index contains a large usable catalog", () => {
  assert.ok(itemList.length > 3000);
  assert.ok(itemList.every((item) => item.ID && item.NAME && item.CATEGORY));
});

test("search finds exact and fuzzy Adopt Me items", () => {
  const frost = searchItems("Frost Dragon", 5);
  assert.ok(frost.some((item) => item.NAME.toLowerCase() === "frost dragon"));
  const fuzzy = searchItems("frost dragn", 8);
  assert.ok(fuzzy.some((item) => item.NAME.toLowerCase() === "frost dragon"));
});

test("id lookup returns the same indexed item", () => {
  const first = itemList[0];
  assert.equal(getItemById(first.ID)?.NAME, first.NAME);
});
