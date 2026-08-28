"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import MM2AddWeaponModal from "./MM2AddWeaponModal";
import MM2TradeSide from "./MM2TradeSide";
import MM2TradeSummary, { getMM2TradeResult, VerdictIcon } from "./MM2TradeSummary";
import MM2TradeBreakdown from "./MM2TradeBreakdown";
import MM2TradeBalanceFinder from "./MM2TradeBalanceFinder";
import styles from "./MM2TradeCalculator.module.css";
import type {
  MM2Item,
  MM2SelectedTradeItem,
  MM2ValueSource,
} from "./MM2TradeTypes";
import {
  buildTradeUrl,
  decodeTradeRows,
  encodeTradeRows,
  loadRecentTrades,
  makeSavedTrade,
  rowsToSelected,
  saveRecentTrades,
  type MM2SavedTrade,
} from "./MM2TradeWorkflow";
// The value/total/missing rules moved to lib/mm2/tradeMath so MM2 NICH answers
// "wfl" with the exact arithmetic this calculator shows, rather than a second
// implementation that can drift. Behaviour here is unchanged.
import {
  mm2ItemValue as getItemValue,
  mm2MissingFor as missingFor,
  mm2TotalFor as totalFor,
} from "../../lib/mm2/tradeMath";

type TradeSideType = "your" | "their";

function createSelectedItem(item: MM2Item): MM2SelectedTradeItem {
  return { id: crypto.randomUUID(), item, quantity: 1 };
}

export default function MM2TradeCalculator({ items }: { items: MM2Item[] }) {
  const shouldReduceMotion = useReducedMotion();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSide, setActiveSide] = useState<TradeSideType>("your");
  const [valueSource, setValueSource] = useState<MM2ValueSource>("SUPREME");
  const [yourItems, setYourItems] = useState<MM2SelectedTradeItem[]>([]);
  const [theirItems, setTheirItems] = useState<MM2SelectedTradeItem[]>([]);
  const [recentTrades, setRecentTrades] = useState<MM2SavedTrade[]>([]);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");
  const [summaryCopyState, setSummaryCopyState] = useState<"idle" | "copied" | "error">("idle");
  const hydratedFromUrl = useRef(false);

  const yourTotal = useMemo(
    () => totalFor(yourItems, valueSource),
    [yourItems, valueSource],
  );
  const theirTotal = useMemo(
    () => totalFor(theirItems, valueSource),
    [theirItems, valueSource],
  );
  const yourMissing = useMemo(
    () => missingFor(yourItems, valueSource),
    [yourItems, valueSource],
  );
  const theirMissing = useMemo(
    () => missingFor(theirItems, valueSource),
    [theirItems, valueSource],
  );

  const totalMissing = yourMissing + theirMissing;
  const tradeIsEmpty = yourItems.length === 0 && theirItems.length === 0;

  const socialTradeQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set("source", valueSource);
    if (yourItems.length) params.set("your", encodeTradeRows(yourItems));
    if (theirItems.length) params.set("their", encodeTradeRows(theirItems));
    return params.toString();
  }, [theirItems, valueSource, yourItems]);

  const mobileResult = useMemo(
    () => getMM2TradeResult(yourTotal, theirTotal, valueSource, totalMissing),
    [yourTotal, theirTotal, valueSource, totalMissing],
  );

  function openAddItemModal(side: TradeSideType) {
    setActiveSide(side);
    setModalOpen(true);
  }

  function addItem(item: MM2Item) {
    const mergeOrAdd = (currentItems: MM2SelectedTradeItem[]) => {
      const existing = currentItems.find(
        (entry) =>
          String(entry.item.ID ?? entry.item.NAME) ===
          String(item.ID ?? item.NAME),
      );

      if (!existing) {
        return [...currentItems, createSelectedItem(item)];
      }

      return currentItems.map((entry) =>
        entry.id === existing.id
          ? { ...entry, quantity: Math.min(99, entry.quantity + 1) }
          : entry,
      );
    };

    if (activeSide === "your") {
      setYourItems(mergeOrAdd);
    } else {
      setTheirItems(mergeOrAdd);
    }

    // Keep the weapon picker open. The user closes it explicitly with X.
  }

  function addSuggestedItem(side: TradeSideType, item: MM2Item) {
    const mergeOrAdd = (currentItems: MM2SelectedTradeItem[]) => {
      const existing = currentItems.find(
        (entry) =>
          String(entry.item.ID ?? entry.item.NAME) ===
          String(item.ID ?? item.NAME),
      );

      if (!existing) {
        return [...currentItems, createSelectedItem(item)];
      }

      return currentItems.map((entry) =>
        entry.id === existing.id
          ? { ...entry, quantity: Math.min(99, entry.quantity + 1) }
          : entry,
      );
    };

    if (side === "your") {
      setYourItems(mergeOrAdd);
    } else {
      setTheirItems(mergeOrAdd);
    }
  }

  function removeYour(id: string) {
    setYourItems((currentItems) =>
      currentItems.filter((selectedItem) => selectedItem.id !== id),
    );
  }

  function removeTheir(id: string) {
    setTheirItems((currentItems) =>
      currentItems.filter((selectedItem) => selectedItem.id !== id),
    );
  }

  function changeQuantity(
    side: TradeSideType,
    id: string,
    nextQuantity: number,
  ) {
    const quantity = Math.max(1, Math.min(99, nextQuantity));
    const update = (currentItems: MM2SelectedTradeItem[]) =>
      currentItems.map((selectedItem) =>
        selectedItem.id === id
          ? { ...selectedItem, quantity }
          : selectedItem,
      );

    if (side === "your") {
      setYourItems(update);
    } else {
      setTheirItems(update);
    }
  }

  function swapSides() {
    const previousYourItems = yourItems;
    setYourItems(theirItems);
    setTheirItems(previousYourItems);
  }

  function clearTrade() {
    setYourItems([]);
    setTheirItems([]);
  }

  /* eslint-disable react-hooks/set-state-in-effect --
     Both effects below hydrate state from browser-only APIs (localStorage and
     window.location), neither of which exists during SSR. Moving either into a
     useState initializer would make the server render empty and the client
     render populated, producing a hydration mismatch. An effect is the correct
     place for this; the rule cannot express the SSR constraint.
     TODO(phase-d): the URL effect can drop the effect entirely by switching to
     Next's useSearchParams() plus a lazy initializer, once /mm2/calculator wraps
     this component in <Suspense> the way /calculator already does.
     TODO(phase-e): recentTrades can move to useSyncExternalStore, matching the
     house pattern in ThemeProvider and useBirthdayEventActive. */
  useEffect(() => {
    setRecentTrades(loadRecentTrades());
  }, []);

  useEffect(() => {
    if (hydratedFromUrl.current) return;
    hydratedFromUrl.current = true;

    const params = new URLSearchParams(window.location.search);
    const source: MM2ValueSource =
      params.get("source") === "GCASH" ? "GCASH" : "SUPREME";

    const yourRows = decodeTradeRows(params.get("your"));
    const theirRows = decodeTradeRows(params.get("their"));

    if (yourRows.length || theirRows.length) {
      setValueSource(source);
      setYourItems(rowsToSelected(yourRows, items));
      setTheirItems(rowsToSelected(theirRows, items));
      return;
    }

    const addKey = params.get("add");
    if (!addKey) return;

    const normalized = addKey.trim().toLowerCase();
    const item = items.find(
      (candidate) =>
        String(candidate.ID ?? "").trim().toLowerCase() === normalized ||
        candidate.NAME.trim().toLowerCase() === normalized,
    );

    if (!item) return;

    setValueSource(source);
    setYourItems([createSelectedItem(item)]);
  }, [items]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function copyTradeLink() {
    try {
      const url = buildTradeUrl({
        valueSource,
        yourItems,
        theirItems,
      });
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  }

  async function copyTradeSummary() {
    const lineFor = (selected: MM2SelectedTradeItem) => {
      const unit = getItemValue(selected.item, valueSource);
      const subtotal =
        unit === null ? null : unit * Math.max(1, selected.quantity);

      return `- ${selected.quantity}x ${selected.item.NAME} | ${valueSource}: ${
        unit === null ? "N/A" : unit.toLocaleString("en-US")
      } each | subtotal: ${
        subtotal === null ? "N/A" : subtotal.toLocaleString("en-US")
      } | demand: ${selected.item.DEMAND ?? 0}/10`;
    };

    const result = getMM2TradeResult(
      yourTotal,
      theirTotal,
      valueSource,
      totalMissing,
    );

    const difference = Math.abs(theirTotal - yourTotal);

    const summary = [
      "CSBT HUB — MM2 Trade Calculator",
      `Value source: ${valueSource}`,
      "",
      "YOUR OFFER",
      ...(yourItems.length ? yourItems.map(lineFor) : ["- Empty"]),
      `Total: ${yourTotal.toLocaleString("en-US")}`,
      "",
      "THEIR OFFER",
      ...(theirItems.length ? theirItems.map(lineFor) : ["- Empty"]),
      `Total: ${theirTotal.toLocaleString("en-US")}`,
      "",
      `RESULT: ${result.title}`,
      `Difference: ${difference.toLocaleString("en-US")}`,
      result.message,
      "",
      "Demand is informational and does not change the W/F/L calculation.",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      setSummaryCopyState("copied");
      window.setTimeout(() => setSummaryCopyState("idle"), 1800);
    } catch {
      setSummaryCopyState("error");
      window.setTimeout(() => setSummaryCopyState("idle"), 1800);
    }
  }

  function saveTradeLocally() {
    if (tradeIsEmpty) return;

    const snapshot = makeSavedTrade({
      valueSource,
      yourItems,
      theirItems,
    });

    const next = [snapshot, ...recentTrades].slice(0, 6);
    setRecentTrades(next);
    saveRecentTrades(next);
    setSaveState("saved");
    window.setTimeout(() => setSaveState("idle"), 1600);
  }

  function openSavedTrade(trade: MM2SavedTrade) {
    setValueSource(trade.valueSource);
    setYourItems(rowsToSelected(trade.your, items));
    setTheirItems(rowsToSelected(trade.their, items));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteSavedTrade(id: string) {
    const next = recentTrades.filter((trade) => trade.id !== id);
    setRecentTrades(next);
    saveRecentTrades(next);
  }

  return (
    <>
      <motion.section
        id="mm2-calculator"
        aria-labelledby="mm2-trade-calculator-heading"
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: shouldReduceMotion ? 0 : 0.55,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative overflow-hidden rounded-[28px] border border-white/[0.10] bg-[#080b12] p-4 shadow-[0_28px_100px_rgba(0,0,0,.48)] sm:rounded-[38px] sm:p-7 lg:p-8"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(220,38,38,.12),transparent_38%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.018)_1px,transparent_1px)] bg-[size:38px_38px]" />
        <div className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-red-300/30 to-transparent" />

        <div className="relative">
          {/* Mirrors the Adopt Me calculator's centered title + compact control row. */}
          <div className="text-center">
            <span className="inline-flex items-center gap-2.5 rounded-full border border-[var(--mm2-edge-lit)] bg-[rgba(226,52,74,.08)] px-4 py-2 text-[11px] font-black uppercase tracking-[.16em] text-[#f0919b] sm:px-5">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--mm2-crimson)]" />
              MM2 Trade Calculator
            </span>

            <h1
              id="mm2-trade-calculator-heading"
              className="mt-4 text-3xl font-black tracking-[-.055em] text-white sm:text-5xl lg:text-6xl"
            >
              Calculate Your Trade
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-[15px] font-medium leading-[1.6] text-[var(--mm2-ink-3)] sm:text-base">
              Compare both MM2 offers using Supreme or GCash values before you trade.
            </p>
          </div>

          <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-3 sm:mt-8 sm:gap-4">
            <select
              value={valueSource}
              onChange={(event) =>
                setValueSource(event.target.value as MM2ValueSource)
              }
              aria-label="MM2 value source"
              className="min-h-12 cursor-pointer rounded-[13px] border border-[var(--mm2-edge-strong)] bg-[#090c12] px-4 py-2.5 text-[14px] font-black text-white outline-none transition hover:border-[var(--mm2-edge-lit)] focus:border-[var(--mm2-crimson)] focus:ring-2 focus:ring-[rgba(226,52,74,.18)] sm:min-h-[52px] sm:px-5"
            >
              <option value="SUPREME" className="bg-[#090c12] text-white">
                Supreme Values
              </option>
              <option value="GCASH" className="bg-[#090c12] text-white">
                GCash Values
              </option>
            </select>

            <motion.button
              type="button"
              onClick={swapSides}
              disabled={tradeIsEmpty}
              whileHover={shouldReduceMotion ? undefined : { y: -1 }}
              className="min-h-12 rounded-[13px] border border-[var(--mm2-edge-strong)] bg-[var(--mm2-riser)] px-5 text-[14px] font-black text-[var(--mm2-ink-2)] transition hover:border-[var(--mm2-edge-lit)] hover:bg-[var(--mm2-lift)] hover:text-white disabled:cursor-not-allowed disabled:opacity-35 sm:min-h-[52px] sm:px-6"
            >
              Swap Offers
            </motion.button>

            <motion.button
              type="button"
              onClick={clearTrade}
              disabled={tradeIsEmpty}
              whileHover={shouldReduceMotion ? undefined : { y: -1 }}
              className="min-h-12 rounded-[13px] border border-[rgba(226,52,74,.30)] bg-[rgba(226,52,74,.07)] px-5 text-[14px] font-black text-[#f0919b] transition hover:bg-[rgba(226,52,74,.13)] hover:text-white disabled:cursor-not-allowed disabled:opacity-35 sm:min-h-[52px] sm:px-6"
            >
              Clear Trade
            </motion.button>
          </div>

          <div className="my-7 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent sm:my-9" />

          {/* Adopt Me philosophy: equal offers first, VS centered, result comes afterwards. */}
          <div className={styles.tradeBoard}>
            <div className="min-w-0">
              <MM2TradeSide
                title="Your Offer"
                subtitle="Weapons you give"
                color="give"
                items={yourItems}
                total={yourTotal}
                missingCount={yourMissing}
                onAdd={() => openAddItemModal("your")}
                onRemove={removeYour}
                onQuantityChange={(id, quantity) =>
                  changeQuantity("your", id, quantity)
                }
                valueSource={valueSource}
              />
            </div>

            {/* A machined divider between the two bays, not a glowing badge.
                It also no longer pulses forever. */}
            <div className={styles.vsColumn}>
              <span
                aria-hidden="true"
                className="flex h-[68px] w-[68px] items-center justify-center rounded-full border border-[var(--mm2-edge-strong)] bg-[linear-gradient(145deg,#161b25,#0a0d13)] text-[15px] font-black tracking-[.08em] text-[var(--mm2-ink-3)] shadow-[inset_0_1px_0_rgba(255,255,255,.05),0_14px_30px_rgba(0,0,0,.4)] 2xl:h-20 2xl:w-20 2xl:text-[17px]"
              >
                VS
              </span>
            </div>

            <div className="min-w-0">
              <MM2TradeSide
                title="Their Offer"
                subtitle="Weapons you receive"
                color="receive"
                items={theirItems}
                total={theirTotal}
                missingCount={theirMissing}
                onAdd={() => openAddItemModal("their")}
                onRemove={removeTheir}
                onQuantityChange={(id, quantity) =>
                  changeQuantity("their", id, quantity)
                }
                valueSource={valueSource}
              />
            </div>
          </div>

          <div className="hidden lg:block">
            <MM2TradeSummary
              yourTotal={yourTotal}
              theirTotal={theirTotal}
              valueSource={valueSource}
              missingCount={totalMissing}
            />
          </div>

          {!tradeIsEmpty ? (
            <MM2TradeBreakdown
              yourItems={yourItems}
              theirItems={theirItems}
              yourTotal={yourTotal}
              theirTotal={theirTotal}
              valueSource={valueSource}
            />
          ) : null}

          <MM2TradeBalanceFinder
            catalog={items}
            yourItems={yourItems}
            theirItems={theirItems}
            yourTotal={yourTotal}
            theirTotal={theirTotal}
            valueSource={valueSource}
            missingCount={totalMissing}
            onAddSuggested={addSuggestedItem}
          />

          <section className="mt-5 rounded-[22px] border border-white/[0.08] bg-white/[0.025] p-4 sm:mt-6 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[.16em] text-[#f0919b]">
                  Trade Tools
                </p>
                <h2 className="mt-1 text-lg font-black text-white">
                  Save it or send it.
                </h2>
                <p className="mt-1 text-[13px] font-semibold text-[var(--mm2-ink-3)]">
                  Shared links reopen the same value source, weapons, and quantities.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={tradeIsEmpty ? "/mm2/exchange" : `/mm2/exchange?${socialTradeQuery}`}
                  aria-disabled={tradeIsEmpty}
                  className={`inline-flex min-h-11 items-center rounded-[12px] border px-4 text-[13px] font-black transition ${tradeIsEmpty ? "pointer-events-none border-[var(--mm2-edge)] text-[var(--mm2-ink-4)]" : "border-[var(--mm2-edge-strong)] bg-white/[0.045] text-[var(--mm2-ink-2)] hover:border-[var(--mm2-edge-lit)] hover:bg-white/[0.075] hover:text-white"}`}
                >
                  Find Trades
                </Link>

                <Link
                  href={tradeIsEmpty ? "/mm2/trade-opinions" : `/mm2/trade-opinions?${socialTradeQuery}`}
                  aria-disabled={tradeIsEmpty}
                  className={`inline-flex min-h-11 items-center rounded-[12px] border px-4 text-[13px] font-black transition ${tradeIsEmpty ? "pointer-events-none border-[var(--mm2-edge)] text-[var(--mm2-ink-4)]" : "border-[var(--mm2-edge-strong)] bg-white/[0.045] text-[var(--mm2-ink-2)] hover:border-[var(--mm2-edge-lit)] hover:bg-white/[0.075] hover:text-white"}`}
                >
                  Ask Trade Opinions
                </Link>

                <button
                  type="button"
                  onClick={copyTradeSummary}
                  disabled={tradeIsEmpty}
                  className="min-h-11 rounded-[12px] border border-[var(--mm2-edge-strong)] bg-white/[0.045] px-4 text-[13px] font-black text-[var(--mm2-ink-2)] transition hover:border-[var(--mm2-edge-lit)] hover:bg-white/[0.075] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {summaryCopyState === "copied"
                    ? "✓ Summary Copied"
                    : summaryCopyState === "error"
                      ? "Copy Failed"
                      : "Copy Trade Summary"}
                </button>

                <button
                  type="button"
                  onClick={copyTradeLink}
                  disabled={tradeIsEmpty}
                  className="min-h-11 rounded-[12px] border border-[rgba(226,52,74,.28)] bg-[rgba(226,52,74,.07)] px-4 text-[13px] font-black text-[#f0919b] transition hover:bg-[rgba(226,52,74,.13)] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {copyState === "copied"
                    ? "✓ Link Copied"
                    : copyState === "error"
                      ? "Copy Failed"
                      : "Copy Trade Link"}
                </button>

                <button
                  type="button"
                  onClick={saveTradeLocally}
                  disabled={tradeIsEmpty}
                  className="min-h-11 rounded-[12px] border border-[var(--mm2-edge-strong)] bg-white/[0.045] px-4 text-[13px] font-black text-[var(--mm2-ink-2)] transition hover:border-[var(--mm2-edge-lit)] hover:bg-white/[0.075] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {saveState === "saved" ? "Saved" : "Save Trade"}
                </button>
              </div>
            </div>
          </section>

          {recentTrades.length ? (
            <section className="mt-5 rounded-[22px] border border-white/[0.08] bg-black/20 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[.16em] text-[var(--mm2-ink-3)]">
                    Recent Trades
                  </p>
                  <h2 className="mt-1 text-lg font-black text-white">
                    Pick up where you left off.
                  </h2>
                </div>
                <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[11px] font-black text-[var(--mm2-ink-3)]">
                  Saved on this device
                </span>
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {recentTrades.map((trade) => {
                  const yourCount = trade.your.reduce(
                    (sum, row) => sum + row.quantity,
                    0,
                  );
                  const theirCount = trade.their.reduce(
                    (sum, row) => sum + row.quantity,
                    0,
                  );

                  return (
                    <article
                      key={trade.id}
                      className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[11px] font-black uppercase tracking-[.1em] text-[#f0919b]">
                            {trade.valueSource}
                          </span>
                          <strong className="mt-1 block text-sm font-black text-white">
                            {yourCount} vs {theirCount} weapons
                          </strong>
                          <span className="mt-1 block text-[12px] font-semibold text-[var(--mm2-ink-3)]">
                            {new Date(trade.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => deleteSavedTrade(trade.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.06] text-[13px] font-black text-[var(--mm2-ink-3)] transition hover:border-[var(--mm2-edge-lit)] hover:text-red-300"
                          aria-label="Delete saved trade"
                        >
                          ×
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => openSavedTrade(trade)}
                        className="mt-3 flex min-h-10 w-full items-center justify-center rounded-xl bg-white/[0.045] text-[10px] font-black text-zinc-300 transition hover:bg-red-500/[0.08] hover:text-red-200"
                      >
                        Open Trade →
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      </motion.section>

      {!modalOpen && !tradeIsEmpty ? (
        <motion.aside
          aria-live="polite"
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18 }}
          animate={{ opacity: 1, y: 0 }}
          className={`fixed inset-x-3 bottom-3 z-50 overflow-hidden rounded-[16px] border border-[var(--mm2-edge-strong)] bg-gradient-to-br p-3 text-white shadow-[var(--mm2-shadow-lift)] lg:hidden ${mobileResult.color}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/20 bg-black/25">
                  <VerdictIcon verdict={mobileResult.title} className="h-5 w-5" />
                </span>
                <p className="text-xl font-black">{mobileResult.title}</p>
              </div>
              <p className="mt-0.5 truncate text-xs font-semibold text-white/85">
                {mobileResult.message}
              </p>
            </div>

            <div className="grid shrink-0 grid-cols-2 overflow-hidden rounded-xl border border-white/15 bg-black/15 text-center">
              <div className="min-w-16 px-2 py-2">
                <p className="text-[9px] font-black uppercase text-white/70">You</p>
                <p className="text-xs font-black tabular-nums">
                  {yourTotal.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="min-w-16 border-l border-white/15 px-2 py-2">
                <p className="text-[9px] font-black uppercase text-white/70">Them</p>
                <p className="text-xs font-black tabular-nums">
                  {theirTotal.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </motion.aside>
      ) : null}

      <MM2AddWeaponModal
        open={modalOpen}
        sideLabel={
          activeSide === "your" ? "ADD TO YOUR OFFER" : "ADD TO THEIR OFFER"
        }
        items={items}
        currentItems={activeSide === "your" ? yourItems : theirItems}
        valueSource={valueSource}
        onClose={() => setModalOpen(false)}
        onSelect={addItem}
      />
    </>
  );
}
