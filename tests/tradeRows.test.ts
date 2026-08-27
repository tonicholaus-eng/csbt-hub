import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTradeContextParams,
  decodeTradeRows,
  encodeTradeRows,
  selectedItemsToRows,
} from "../src/lib/tradeContext";
import {
  decodeTradeRows as decodeMM2Rows,
  rowsToSelected,
  selectedToRows,
} from "../src/components/mm2/MM2TradeWorkflow";
import { buildCalculatorHref } from "../src/games/registry";
import { mm2Catalog } from "../src/lib/mm2/catalog";
import { itemList } from "../src/lib/search";
import type { MM2Item } from "../src/components/mm2/MM2TradeTypes";

// ---------------------------------------------------------------------------
// Adopt Me codec  (id~variant~quantity)
// ---------------------------------------------------------------------------

const sampleIds = itemList.slice(0, 5).map((item) => item.ID);

test("Adopt Me trade rows survive an encode/decode round trip", () => {
  const rows = [
    { itemId: sampleIds[0], valueType: "NORMAL" as const, quantity: 1 },
    { itemId: sampleIds[1], valueType: "NEON" as const, quantity: 7 },
    { itemId: sampleIds[2], valueType: "MEGA" as const, quantity: 99 },
  ];
  assert.deepEqual(decodeTradeRows(encodeTradeRows(rows)), rows);
});

test("Adopt Me quantities are clamped to 1-99", () => {
  const encoded = encodeTradeRows([
    { itemId: sampleIds[0], valueType: "NORMAL", quantity: 0 },
    { itemId: sampleIds[1], valueType: "NORMAL", quantity: 1000 },
  ]);
  const decoded = decodeTradeRows(encoded);
  assert.equal(decoded[0].quantity, 1);
  assert.equal(decoded[1].quantity, 99);
});

test("Adopt Me decoding drops items that are not in the catalog", () => {
  const encoded = `${encodeTradeRows([{ itemId: sampleIds[0], valueType: "NORMAL", quantity: 1 }])},not-a-real-item~NORMAL~1`;
  const decoded = decodeTradeRows(encoded);
  assert.equal(decoded.length, 1);
  assert.equal(decoded[0].itemId, sampleIds[0]);
});

test("Adopt Me decoding is capped and survives hostile input", () => {
  const many = Array.from({ length: 40 }, () => `${sampleIds[0]}~NORMAL~1`).join(",");
  assert.equal(decodeTradeRows(many).length, 18);

  for (const bad of [null, undefined, "", "~~~", "%%%~NORMAL~1", "a~b~c~d~e"]) {
    assert.deepEqual(decodeTradeRows(bad as string | null), []);
  }
});

test("an unknown variant falls back to NORMAL rather than being trusted", () => {
  const decoded = decodeTradeRows(`${sampleIds[0]}~SPARKLY~2`);
  assert.equal(decoded.length, 1);
  assert.equal(decoded[0].valueType, "NORMAL");
});

test("item ids needing URL encoding round trip intact", () => {
  const awkward = itemList.find((item) => /[^a-zA-Z0-9-]/.test(item.ID));
  if (!awkward) return; // nothing to prove on this catalog
  const decoded = decodeTradeRows(
    encodeTradeRows([{ itemId: awkward.ID, valueType: "NORMAL", quantity: 1 }]),
  );
  assert.equal(decoded[0]?.itemId, awkward.ID);
});

test("buildTradeContextParams carries source and both sides", () => {
  const params = buildTradeContextParams(
    [{ itemId: sampleIds[0], valueType: "NORMAL", quantity: 2 }],
    [{ itemId: sampleIds[1], valueType: "NEON", quantity: 1 }],
    "ELVE",
  );
  assert.equal(params.get("source"), "ELVE");
  assert.ok(params.get("your"));
  assert.ok(params.get("their"));
  assert.deepEqual(decodeTradeRows(params.get("their")), [
    { itemId: sampleIds[1], valueType: "NEON", quantity: 1 },
  ]);
});

test("selectedItemsToRows preserves the chosen variant", () => {
  const item = itemList[0];
  const rows = selectedItemsToRows([{ id: "x", item, valueType: "MEGA" }]);
  assert.equal(rows[0].itemId, item.ID);
  assert.equal(rows[0].valueType, "MEGA");
});

// ---------------------------------------------------------------------------
// MM2 codec  (JSON [{key, quantity}])
// ---------------------------------------------------------------------------

const mm2Sample: MM2Item[] = mm2Catalog.slice(0, 4);

test("MM2 trade rows survive an encode/decode round trip with quantities", () => {
  const selected = mm2Sample.map((item, index) => ({
    id: `sel-${index}`,
    item,
    quantity: index + 1,
  }));
  const rows = selectedToRows(selected);
  const decoded = decodeMM2Rows(JSON.stringify(rows));
  assert.deepEqual(decoded, rows);
});

test("MM2 rowsToSelected resolves keys back to the right weapons", () => {
  const rows = mm2Sample.map((item) => ({ key: String(item.ID), quantity: 3 }));
  const selected = rowsToSelected(rows, mm2Catalog);
  assert.equal(selected.length, rows.length);
  for (const [index, entry] of selected.entries()) {
    assert.equal(entry.item.ID, mm2Sample[index].ID);
    assert.equal(entry.quantity, 3);
  }
});

test("MM2 rowsToSelected drops unknown keys instead of inventing weapons", () => {
  const selected = rowsToSelected(
    [{ key: "definitely-not-a-weapon", quantity: 1 }, { key: String(mm2Sample[0].ID), quantity: 2 }],
    mm2Catalog,
  );
  assert.equal(selected.length, 1);
  assert.equal(selected[0].item.ID, mm2Sample[0].ID);
});

test("MM2 decoding survives hostile input", () => {
  for (const bad of [null, "", "not json", "{}", "[1,2,3]", '[{"quantity":5}]']) {
    assert.deepEqual(decodeMM2Rows(bad as string | null), []);
  }
});

test("MM2 quantities are clamped to 1-99", () => {
  const decoded = decodeMM2Rows(
    JSON.stringify([
      { key: "a", quantity: 0 },
      { key: "b", quantity: -4 },
      { key: "c", quantity: 5000 },
    ]),
  );
  assert.deepEqual(decoded.map((row) => row.quantity), [1, 1, 99]);
});

// ---------------------------------------------------------------------------
// The cross-feature contract: buildCalculatorHref must produce something each
// game's calculator can actually read back (audit B-03).
// ---------------------------------------------------------------------------

test("MM2 calculator hrefs decode back into the same weapons and quantities", () => {
  const rows = mm2Sample.slice(0, 2).map((item, index) => ({
    itemId: String(item.ID),
    quantity: index + 2,
  }));
  const href = buildCalculatorHref("mm2", { your: rows, their: [] }, "SUPREME");
  const params = new URLSearchParams(href.slice(href.indexOf("?") + 1));

  const decoded = decodeMM2Rows(params.get("your"));
  assert.equal(decoded.length, rows.length);
  assert.deepEqual(
    decoded.map((row) => [row.key, row.quantity]),
    rows.map((row) => [row.itemId, row.quantity]),
  );

  const selected = rowsToSelected(decoded, mm2Catalog);
  assert.equal(selected.length, rows.length);
  assert.equal(selected[0].item.ID, rows[0].itemId);
});

test("Adopt Me calculator hrefs decode back into the same items, variants and quantities", () => {
  const rows = [
    { itemId: sampleIds[0], variant: "NORMAL" as const, quantity: 2 },
    { itemId: sampleIds[1], variant: "NEON" as const, quantity: 5 },
  ];
  const href = buildCalculatorHref("adopt-me", { your: rows, their: [] }, "GCASH");
  const params = new URLSearchParams(href.slice(href.indexOf("?") + 1));

  assert.equal(params.get("source"), "GCASH");
  assert.deepEqual(decodeTradeRows(params.get("your")), [
    { itemId: sampleIds[0], valueType: "NORMAL", quantity: 2 },
    { itemId: sampleIds[1], valueType: "NEON", quantity: 5 },
  ]);
});

test("duplicates collapse into a quantity and expand back to the same count", () => {
  const item = itemList[0];
  const selected = [
    { id: "a", item, valueType: "NORMAL" as const },
    { id: "b", item, valueType: "NORMAL" as const },
    { id: "c", item, valueType: "NORMAL" as const },
    { id: "d", item, valueType: "NEON" as const },
  ];

  const rows = selectedItemsToRows(selected);
  // Three identical NORMAL rows merge; the NEON one stays separate.
  assert.equal(rows.length, 2);
  assert.equal(rows[0].quantity, 3);
  assert.equal(rows[0].valueType, "NORMAL");
  assert.equal(rows[1].quantity, 1);
  assert.equal(rows[1].valueType, "NEON");

  // And the encoded form expands back to the original four selections.
  const decoded = decodeTradeRows(encodeTradeRows(rows));
  const expanded = decoded.reduce((sum, row) => sum + row.quantity, 0);
  assert.equal(expanded, selected.length);
});
