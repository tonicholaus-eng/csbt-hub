/**
 * Mobile responsiveness, checked at the source.
 *
 * There is no browser in this suite, so these tests cannot measure a rendered
 * layout. What they can do — and what actually catches the regressions that
 * matter — is assert the *rules*: that a grid collapses at a phone width, that
 * a control clears the home indicator, that a form field is large enough not to
 * trigger Safari's zoom, that nothing pins a fixed pixel width wider than the
 * narrowest phone we support.
 *
 * Every check here corresponds to a bug that was actually present before this
 * pass, so each one is a regression guard rather than a style preference.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repo = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(repo, relative), "utf8");

/** The narrowest phone CSBT supports. */
const NARROWEST = 320;

function walk(dir: string, match: RegExp, files: string[] = []): string[] {
  const full = path.join(repo, dir);
  if (!fs.existsSync(full)) return files;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(relative, match, files);
    else if (match.test(entry.name)) files.push(relative);
  }
  return files;
}

const allMM2Components = walk("src/components/mm2", /\.tsx$/);
const mm2Styles = walk("src/components/mm2", /\.css$/);

/**
 * Only components something actually renders.
 *
 * Three MM2 files (an old hero, a home board, a value hero) are no longer
 * imported anywhere. Auditing their layout would report bugs no user can reach,
 * and would make this suite noisy enough to start ignoring.
 */
const reachable = new Set<string>();
for (const file of [...walk("src/components", /\.tsx$/), ...walk("src/app", /\.tsx$/)]) {
  const source = read(file);
  for (const candidate of allMM2Components) {
    if (candidate === file) continue;
    const name = path.basename(candidate, ".tsx");
    if (new RegExp(`from "[^"]*/${name}"`).test(source)) reachable.add(candidate);
  }
}

const mm2Components = allMM2Components.filter((file) => reachable.has(file));
const globals = read("src/app/globals.css");

// ---------------------------------------------------------------------------
// Shared foundation
// ---------------------------------------------------------------------------

test("form controls are big enough that Safari will not zoom the page", () => {
  // Under 16px, focusing an input scales the whole viewport and leaves the user
  // scrolled sideways — the single most common "the site is broken on my phone"
  // report. The floor is enforced globally; it has to beat class selectors.
  assert.match(globals, /pointer: coarse/);
  const guard = globals.slice(globals.indexOf("iOS input zoom"));
  assert.match(guard, /font-size: 16px !important/);
  assert.match(guard, /textarea/);
});

test("the app defines safe-area helpers and MM2 uses them", () => {
  for (const helper of ["csbt-safe-bottom", "csbt-safe-top", "csbt-safe-x"]) {
    assert.match(globals, new RegExp(`\\.${helper}`), `${helper} is missing`);
    assert.match(globals, /env\(safe-area-inset/);
  }

  const navbar = read("src/components/mm2/MM2Navbar.tsx");
  assert.match(navbar, /csbt-safe-top/, "the MM2 mobile header must clear the notch");
});

test("the calculator verdict bar clears the home indicator", () => {
  const calculator = read("src/components/mm2/MM2TradeCalculator.tsx");
  // It is fixed to the bottom of the viewport, so a bare `bottom-3` sits on the
  // gesture bar on any modern iPhone.
  assert.match(calculator, /bottom-\[max\(12px,env\(safe-area-inset-bottom\)\)\]/);
});

test("MM2 pages do not reserve space for a bottom dock they do not have", () => {
  // Adopt Me's mobile dock spacer is body padding. MM2 has no dock, so that was
  // 74px of dead screen at the foot of every MM2 page.
  assert.match(globals, /body:has\(\.mm2-mode\)\s*\{\s*padding-bottom: env\(safe-area-inset-bottom\)/);
});

// ---------------------------------------------------------------------------
// Layout collapses at phone widths
// ---------------------------------------------------------------------------

test("the trade calculator stacks into one column on phones", () => {
  const css = read("src/components/mm2/MM2TradeCalculator.module.css");

  // Two 1fr columns at 390px gave each side ~170px. Below 640 it is a sequence.
  const phoneBlock = css.slice(css.indexOf("@media (max-width: 639px)"));
  assert.ok(phoneBlock.length > 0, "no phone breakpoint for the trade board");
  assert.match(phoneBlock, /\.tradeBoard\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

test("MM2 card grids are single-column below the small breakpoint", () => {
  // Tailwind's unprefixed `grid-cols-N` applies at every width, so a bare
  // `grid-cols-3` is a three-column layout on a 320px screen.
  const offenders: string[] = [];

  for (const file of mm2Components) {
    const source = read(file);
    for (const match of source.matchAll(/className="([^"]*grid[^"]*)"/g)) {
      const classes = match[1];
      // Two or three short cells still work at 320px — a card's action bar is
      // exactly that, and reads better as a row than as a stack. Four or more
      // leaves under 70px each, which is where labels wrap mid-word.
      const bare = /(?:^|\s)grid-cols-([4-9]|1[0-2])(?:\s|$)/.exec(classes);
      if (bare) offenders.push(`${file}: grid-cols-${bare[1]} with no breakpoint prefix`);
    }
  }

  assert.deepEqual(offenders, [], `multi-column grids on phones:\n${offenders.join("\n")}`);
});

test("nothing forces a track wider than the narrowest supported phone", () => {
  const offenders: string[] = [];

  for (const file of [...mm2Components, ...mm2Styles]) {
    // A media query condition is not an element width.
    const source = read(file)
      .split(/\r?\n/)
      .filter((line) => !line.includes("@media"))
      .join("\n");

    // Tailwind min-w-[NNNpx] and CSS min-width: NNNpx both pin a floor that a
    // 320px screen cannot honour, which is what pushes a page sideways.
    // A breakpoint-prefixed utility (`lg:min-w-[540px]`) only applies above that
    // breakpoint, so it is not a phone constraint.
    for (const match of source.matchAll(/(^|[\s"])min-w-\[(\d+)px\]/g)) {
      if (Number(match[2]) > NARROWEST) offenders.push(`${file}: min-w-[${match[2]}px]`);
    }
    for (const match of source.matchAll(/min-width:\s*(\d+)px/g)) {
      if (Number(match[1]) > NARROWEST) offenders.push(`${file}: min-width ${match[1]}px`);
    }
  }

  assert.deepEqual(offenders, [], `fixed widths wider than a phone:\n${offenders.join("\n")}`);
});

test("the desktop sidebar never occupies a phone screen", () => {
  const navbar = read("src/components/mm2/MM2Navbar.tsx");
  // 288px of fixed rail on a 320px screen would leave 32px of page.
  assert.match(navbar, /w-\[288px\][^"]*lg:flex/);
  assert.match(navbar, /hidden w-\[288px\]|w-\[288px\][^"]*hidden/);

  const shell = read("src/components/mm2/MM2Shell.tsx");
  // The content offset that matches the rail is applied at the same breakpoint.
  assert.match(shell, /lg:pl-\[288px\]/);
});

// ---------------------------------------------------------------------------
// MM2 homepage: function before scenery
// ---------------------------------------------------------------------------

test("the MM2 homepage opens with actions on a phone, not with scenery", () => {
  const home = read("src/components/mm2/MM2HQHome.tsx");
  assert.match(home, /<MM2MobileLaunchpad/, "the phone launchpad is not mounted");

  // It must come before the room, or it is not an opening.
  const launchpadAt = home.indexOf("<MM2MobileLaunchpad");
  const roomAt = home.indexOf("styles.commandRoom");
  assert.ok(launchpadAt > 0 && launchpadAt < roomAt, "the launchpad must precede the command room");

  const css = read("src/components/mm2/MM2HQHome.module.css");
  const phone = css.slice(css.indexOf("@media (max-width: 720px)"));
  // The room's own header and terminal would repeat the launchpad.
  assert.match(phone, /\.commandHeader,\s*\n\s*\.terminalZone \{ display: none; \}/);
  // And the vault stops being a 600px stage.
  assert.match(phone, /\.vaultZone \{ min-height: 0/);
});

test("the launchpad is phone-only and does not touch the desktop page", () => {
  const css = read("src/components/mm2/MM2MobileLaunchpad.module.css");
  // Hidden by default, revealed only inside the phone breakpoint.
  assert.match(css, /\.launchpad \{\s*display: none;\s*\}/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.ok(css.indexOf(".launchpad {") < css.indexOf("@media (max-width: 720px)"));
});

test("the launchpad leads with search and the four main destinations", () => {
  const component = read("src/components/mm2/MM2MobileLaunchpad.tsx");

  for (const href of ["/mm2/values", "/mm2/calculator", "/mm2/nich", "/mm2/demand"]) {
    assert.ok(component.includes(`"${href}"`), `${href} is not on the launchpad`);
  }

  assert.match(component, /role="search"/);
  assert.match(component, /type="search"/);
  assert.match(component, /enterKeyHint="search"/, "the phone keyboard should offer a search key");
  // Search has to reach the browser it belongs to.
  assert.match(component, /\/mm2\/values\?q=\$\{encodeURIComponent/);

  const css = read("src/components/mm2/MM2MobileLaunchpad.module.css");
  assert.match(css, /font-size: 16px/, "the search field must not trigger zoom");
  assert.match(css, /min-height: 92px/, "the destination tiles must be comfortably tappable");
});

// ---------------------------------------------------------------------------
// MM2 NICH: the conversation owns the screen
// ---------------------------------------------------------------------------

test("the NICH rail folds behind one control on phones", () => {
  const console_ = read("src/components/mm2/nich/MM2NichConsole.tsx");
  assert.match(console_, /referenceOpen/, "no collapsible reference panel");
  assert.match(console_, /aria-expanded=\{referenceOpen\}/, "the toggle must announce its state");

  const css = read("src/components/mm2/nich/MM2NichConsole.module.css");
  // Desktop: the wrapper is invisible to layout, so the rail is unchanged.
  assert.match(css, /\.reference \{ display: contents; \}/);
  assert.match(css, /\.referenceToggle \{ display: none; \}/);

  const phone = css.slice(css.indexOf("@media (max-width: 860px)"));
  assert.match(phone, /\.portrait \{ display: none; \}/, "the 160px portrait should not sit above the composer");
  assert.match(phone, /\.referenceOpen \{ display: grid; \}/);
});

test("NICH chat text stays readable on a phone", () => {
  const css = read("src/components/mm2/nich/MM2NichConsole.module.css");
  const phone = css.slice(css.indexOf("@media (max-width: 560px)"));
  // 12.5px body text is below the readable floor for a paragraph of trade maths.
  assert.doesNotMatch(phone, /font-size: 12\.5px/);
  assert.match(phone, /\.userTurn span \{[^}]*font-size: 14px/);
});

// ---------------------------------------------------------------------------
// Typography and touch
// ---------------------------------------------------------------------------

test("MM2 micro-labels are lifted to a readable size on phones", () => {
  assert.match(globals, /Minimum legible type on phones/);
  const block = globals.slice(globals.indexOf("Minimum legible type on phones"));
  assert.match(block, /text-\[8px\]/);
  assert.match(block, /font-size: 11px/);
});

test("the most-tapped MM2 controls have a real touch target", () => {
  assert.match(globals, /\.csbt-tap::after/);
  const block = globals.slice(globals.indexOf(".csbt-tap::after"));
  assert.match(block, /width: max\(100%, 44px\)/);
  assert.match(block, /height: max\(100%, 44px\)/);

  // Removing a weapon is the calculator's most-used control and was a 28px dot.
  const card = read("src/components/mm2/MM2TradeWeaponCard.tsx");
  assert.match(card, /csbt-tap absolute right-2 top-2/);

  // The picker's close and clear buttons were 40px.
  const picker = read("src/components/mm2/MM2AddWeaponModal.tsx");
  assert.equal((picker.match(/csbt-tap/g) ?? []).length, 2);
});

test("MM2 horizontal scrollers behave like touch scrollers", () => {
  assert.match(globals, /\.csbt-scroll-x/);
  const block = globals.slice(globals.indexOf(".csbt-scroll-x"));
  assert.match(block, /overscroll-behavior-x: contain/);
  assert.match(block, /scroll-snap-type/);

  const navbar = read("src/components/mm2/MM2Navbar.tsx");
  assert.match(navbar, /csbt-scroll-x/, "the MM2 section rail should use the shared scroller");
  // And its chips should be a full touch target.
  assert.match(navbar, /min-h-11 shrink-0 items-center gap-1\.5 border/);
});

// ---------------------------------------------------------------------------
// The item picker is a sheet, not a shrunken dialog
// ---------------------------------------------------------------------------

test("the weapon picker fills the phone screen", () => {
  const picker = read("src/components/mm2/MM2AddWeaponModal.tsx");
  // Dynamic viewport height, so the browser chrome collapsing does not clip it.
  assert.match(picker, /h-\[94dvh\] w-full/);
  assert.match(picker, /grid-cols-2[^"]*md:grid-cols-3/, "two columns of weapons on a phone, not five");
});

// ---------------------------------------------------------------------------
// Nothing essential hides behind hover
// ---------------------------------------------------------------------------

test("no MM2 action or value is revealed only on hover", () => {
  const offenders: string[] = [];

  for (const file of mm2Components) {
    const source = read(file);
    for (const match of source.matchAll(/className="([^"]*group-hover:opacity-100[^"]*)"/g)) {
      // Decorative sweeps and edge lights are fine; they carry no information.
      if (!/pointer-events-none/.test(match[1])) offenders.push(`${file}: ${match[1].slice(0, 70)}`);
    }
  }

  assert.deepEqual(offenders, [], `hover-only content on touch screens:\n${offenders.join("\n")}`);
});
