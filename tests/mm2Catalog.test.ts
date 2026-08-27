import test from "node:test";
import assert from "node:assert/strict";

import {
  mm2Catalog,
  mm2Demand,
  mm2ProfileHref,
  mm2SupremeValue,
  resolveMM2Item,
} from "../src/lib/mm2/catalog";
import { getGameAdapter } from "../src/games/registry";

// ---------------------------------------------------------------------------
// Catalog integrity
// ---------------------------------------------------------------------------

test("MM2 catalog has the expected size and unique identifiers", () => {
  assert.equal(mm2Catalog.length, 1099);
  assert.equal(new Set(mm2Catalog.map((item) => item.ID)).size, mm2Catalog.length);
  assert.equal(new Set(mm2Catalog.map((item) => item.NAME)).size, mm2Catalog.length);
});

test("every weapon resolves uniquely and correctly by its canonical ID", () => {
  for (const item of mm2Catalog) {
    const resolved = resolveMM2Item(item.ID);
    assert.equal(resolved.status, "found", `${item.NAME} (${item.ID}) did not resolve`);
    if (resolved.status !== "found") continue;
    assert.equal(resolved.item.ID, item.ID, `${item.ID} resolved to ${resolved.item.ID}`);
    assert.equal(resolved.canonical, true);
  }
});

test("every weapon also resolves correctly by its exact name", () => {
  for (const item of mm2Catalog) {
    const resolved = resolveMM2Item(item.NAME);
    assert.equal(resolved.status, "found", `${item.NAME} did not resolve by name`);
    if (resolved.status !== "found") continue;
    assert.equal(resolved.item.ID, item.ID, `"${item.NAME}" resolved to ${resolved.item.NAME}`);
    // Resolved by name, so the page should redirect to the canonical ID URL.
    assert.equal(resolved.canonical, false);
  }
});

test("canonical profile hrefs are ID-based and unique across the catalog", () => {
  const hrefs = mm2Catalog.map((item) => mm2ProfileHref(item));
  assert.equal(new Set(hrefs).size, mm2Catalog.length);
  for (const href of hrefs) assert.ok(href.startsWith("/mm2/values/"));
});

// ---------------------------------------------------------------------------
// The five known normalized-name collisions (audit 19 / B-04)
//
// Before the fix, `.find()` returned the first array match, so the second
// weapon of each pair was unreachable and its URL rendered the other weapon's
// value - a 10x error for Rainbow Gun and Xenoknife.
// ---------------------------------------------------------------------------

const COLLISION_PAIRS = [
  { a: "Chroma Sun Set", b: "Chroma Sunset" },
  { a: "Ice Cream", b: "Icecream" },
  { a: "Rainbow (Gun)", b: "Rainbow Gun" },
  { a: "Sun Set", b: "Sunset" },
  { a: "Xeno (Knife)", b: "Xenoknife" },
] as const;

test("both weapons in every known collision pair exist and are distinct", () => {
  for (const { a, b } of COLLISION_PAIRS) {
    const left = mm2Catalog.find((item) => item.NAME === a);
    const right = mm2Catalog.find((item) => item.NAME === b);
    assert.ok(left, `missing ${a}`);
    assert.ok(right, `missing ${b}`);
    assert.notEqual(left.ID, right.ID, `${a} and ${b} share an ID`);
  }
});

test("each colliding weapon resolves to ITSELF, never to its twin", () => {
  for (const { a, b } of COLLISION_PAIRS) {
    for (const name of [a, b]) {
      const expected = mm2Catalog.find((item) => item.NAME === name);
      assert.ok(expected);

      const byName = resolveMM2Item(name);
      assert.equal(byName.status, "found");
      if (byName.status === "found") {
        assert.equal(byName.item.NAME, name, `"${name}" resolved to "${byName.item.NAME}"`);
      }

      const byId = resolveMM2Item(expected.ID);
      assert.equal(byId.status, "found");
      if (byId.status === "found") {
        assert.equal(byId.item.ID, expected.ID);
      }
    }
  }
});

test("Rainbow Gun keeps its own value instead of Rainbow (Gun)'s", () => {
  const godly = resolveMM2Item("Rainbow Gun");
  const rare = resolveMM2Item("Rainbow (Gun)");
  assert.equal(godly.status, "found");
  assert.equal(rare.status, "found");
  if (godly.status !== "found" || rare.status !== "found") return;

  assert.equal(godly.item.CATEGORY, "GODLY");
  assert.equal(mm2SupremeValue(godly.item), 420);
  assert.equal(rare.item.CATEGORY, "RARE");
  assert.equal(mm2SupremeValue(rare.item), 41);
});

test("Xenoknife keeps its own value instead of Xeno (Knife)'s", () => {
  const godly = resolveMM2Item("Xenoknife");
  const rare = resolveMM2Item("Xeno (Knife)");
  assert.equal(godly.status, "found");
  assert.equal(rare.status, "found");
  if (godly.status !== "found" || rare.status !== "found") return;

  assert.equal(mm2SupremeValue(godly.item), 310);
  assert.equal(mm2SupremeValue(rare.item), 31);
});

test("an ambiguous normalized slug is reported, never silently guessed", () => {
  // "rainbowgun" strips the parentheses that distinguish the two weapons.
  const resolved = resolveMM2Item("rainbowgun");
  assert.equal(resolved.status, "ambiguous");
  if (resolved.status !== "ambiguous") return;
  assert.equal(resolved.candidates.length, 2);
  const names = resolved.candidates.map((item) => item.NAME).sort();
  assert.deepEqual(names, ["Rainbow (Gun)", "Rainbow Gun"]);
});

test("a collision slug either matches a real name exactly, or is reported ambiguous", () => {
  // For three of the five pairs the stripped slug IS one weapon's actual name
  // ("Icecream", "Sunset", "Xenoknife"). Exact match must win there - someone
  // typing "icecream" means the weapon called Icecream. Only where the slug
  // matches no real name may the resolver fall back, and then it must refuse to
  // guess between the two candidates.
  for (const { a } of COLLISION_PAIRS) {
    const slug = a.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const exact = mm2Catalog.find((item) => item.NAME.toLowerCase() === slug);
    const resolved = resolveMM2Item(slug);

    if (exact) {
      assert.equal(resolved.status, "found", `"${slug}" is a real name and must resolve`);
      if (resolved.status === "found") {
        assert.equal(resolved.item.ID, exact.ID, `"${slug}" resolved to the wrong weapon`);
      }
    } else {
      assert.equal(
        resolved.status,
        "ambiguous",
        `"${slug}" matches no exact name, so it must be ambiguous rather than guessed`,
      );
    }
  }
});

test("the three collision slugs that ARE real names resolve to that exact weapon", () => {
  const cases = [
    { slug: "icecream", name: "Icecream", category: "GODLY" },
    { slug: "sunset", name: "Sunset", category: "GODLY" },
    { slug: "xenoknife", name: "Xenoknife", category: "GODLY" },
  ] as const;

  for (const { slug, name, category } of cases) {
    const resolved = resolveMM2Item(slug);
    assert.equal(resolved.status, "found", `"${slug}" should resolve`);
    if (resolved.status !== "found") continue;
    assert.equal(resolved.item.NAME, name);
    assert.equal(resolved.item.CATEGORY, category);
  }
});

// ---------------------------------------------------------------------------
// Legacy / hostile URL handling
// ---------------------------------------------------------------------------

test("unambiguous legacy slugs still resolve to the right weapon", () => {
  const resolved = resolveMM2Item("black-luger");
  assert.equal(resolved.status, "found");
  if (resolved.status !== "found") return;
  assert.equal(resolved.item.NAME, "Black Luger");
  assert.equal(resolved.canonical, false);
});

test("unknown and malformed segments resolve to missing, not to a weapon", () => {
  for (const bad of ["", "   ", "definitely-not-a-weapon", "%%%", "%E0%A4%A"]) {
    assert.equal(resolveMM2Item(bad).status, "missing", `"${bad}" should be missing`);
  }
});

test("resolution is case and whitespace insensitive", () => {
  const resolved = resolveMM2Item("  bLaCk LuGeR  ");
  assert.equal(resolved.status, "found");
  if (resolved.status !== "found") return;
  assert.equal(resolved.item.NAME, "Black Luger");
});

// ---------------------------------------------------------------------------
// Registry lookup must not resolve an ambiguous name to the wrong weapon
// (audit 19 / B-05: buildLookup used to be last-write-wins)
// ---------------------------------------------------------------------------

test("registry getItem resolves colliding MM2 names exactly, never to the twin", () => {
  const mm2 = getGameAdapter("mm2");
  for (const { a, b } of COLLISION_PAIRS) {
    for (const name of [a, b]) {
      const item = mm2.getItem(name);
      assert.ok(item, `registry lost "${name}"`);
      assert.equal(item.name, name, `registry returned "${item.name}" for "${name}"`);
    }
  }
});

test("registry getItem resolves every MM2 weapon by ID", () => {
  const mm2 = getGameAdapter("mm2");
  for (const item of mm2Catalog) {
    const found = mm2.getItem(item.ID);
    assert.ok(found, `registry lost ${item.ID}`);
    assert.equal(found.id, item.ID);
  }
});

test("registry getItem never returns a wrong Adopt Me item for an exact name", () => {
  const adopt = getGameAdapter("adopt-me");
  for (const item of adopt.items.slice(0, 400)) {
    const found = adopt.getItem(item.name);
    assert.ok(found, `Adopt Me lost "${item.name}"`);
    assert.equal(found.name, item.name);
  }
});

test("MM2 adapter profile hrefs point at the canonical ID route", () => {
  const mm2 = getGameAdapter("mm2");
  const rainbowGodly = mm2.getItem("Rainbow Gun");
  assert.ok(rainbowGodly);
  assert.equal(mm2.itemProfileHref(rainbowGodly), "/mm2/values/mm2-rainbow-gun-godly");
});

// ---------------------------------------------------------------------------
// Missing-value honesty
// ---------------------------------------------------------------------------

test("unpriced weapons report null rather than zero", () => {
  const unpriced = mm2Catalog.filter((item) => mm2SupremeValue(item) === null);
  assert.equal(unpriced.length, 189);
  for (const item of unpriced) {
    assert.notEqual(mm2SupremeValue(item), 0, `${item.NAME} reported 0 instead of null`);
  }
});

test("no weapon carries a zero Supreme value that could be mistaken for a price", () => {
  assert.equal(mm2Catalog.filter((item) => item.SOURCE_VALUE === 0).length, 0);
});

test("demand is null when unrated and within 0-10 otherwise", () => {
  for (const item of mm2Catalog) {
    const demand = mm2Demand(item);
    if (demand === null) continue;
    assert.ok(demand >= 0 && demand <= 10, `${item.NAME} demand ${demand} out of range`);
  }
});
