"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import MM2WeaponPlate from "./MM2WeaponPlate";
import type { MM2Item, MM2SelectedTradeItem, MM2ValueSource } from "./MM2TradeTypes";

const ITEMS_PER_PAGE = 30;

function imageUrl(image?: string) {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  const clean = image.replace(/^\.\.\//, "/").replace(/^\/+/, "/");
  return `https://supremevalues.com${clean}`;
}

function valueFor(item: MM2Item, source: MM2ValueSource) {
  const value = source === "SUPREME" ? item.SOURCE_VALUE : item.GCASH_VALUE;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatValue(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)
    : "N/A";
}

export default function MM2AddWeaponModal({
  open,
  sideLabel,
  items,
  currentItems,
  valueSource,
  onClose,
  onSelect,
}: {
  open: boolean;
  sideLabel: string;
  items: MM2Item[];
  currentItems: MM2SelectedTradeItem[];
  valueSource: MM2ValueSource;
  onClose: () => void;
  onSelect: (item: MM2Item) => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const deferredSearch = useDeferredValue(search);

  const offerQuantities = useMemo(() => {
    const result = new Map<string, number>();

    for (const selected of currentItems) {
      const key = String(selected.item.ID ?? selected.item.NAME);
      result.set(
        key,
        (result.get(key) ?? 0) + Math.max(1, selected.quantity),
      );
    }

    return result;
  }, [currentItems]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(items.map((item) => item.CATEGORY).filter(Boolean) as string[]),
      ).sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const filteredItems = useMemo(() => {
    const normalized = deferredSearch.trim().toLowerCase();

    return items
      .filter((item) => category === "ALL" || item.CATEGORY === category)
      .filter((item) => {
        if (!normalized) return true;
        return (
          item.NAME.toLowerCase().includes(normalized) ||
          (item.CATEGORY ?? "").toLowerCase().includes(normalized) ||
          (item.TYPE ?? "").toLowerCase().includes(normalized)
        );
      })
      .filter((item) => valueFor(item, valueSource) !== null)
      .sort((a, b) => {
        const av = valueFor(a, valueSource) ?? 0;
        const bv = valueFor(b, valueSource) ?? 0;
        return bv - av || a.NAME.localeCompare(b.NAME);
      });
  }, [items, category, deferredSearch, valueSource]);

  const visibleItems = useMemo(
    () => filteredItems.slice(0, visibleCount),
    [filteredItems, visibleCount],
  );

  useEffect(() => {
    queueMicrotask(() => setVisibleCount(ITEMS_PER_PAGE));
  }, [deferredSearch, category, valueSource]);

  useEffect(() => {
    if (!open) {
      queueMicrotask(() => {
        setSearch("");
        setCategory("ALL");
        setVisibleCount(ITEMS_PER_PAGE);
      });
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(
      () => searchInputRef.current?.focus(),
      shouldReduceMotion ? 0 : 100,
    );

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, shouldReduceMotion]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/[0.92] p-2 sm:p-4"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            style={{ backgroundColor: "#080a10" }}
            aria-labelledby="mm2-add-weapon-title"
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 24, scale: shouldReduceMotion ? 1 : 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 18, scale: shouldReduceMotion ? 1 : 0.98 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-[24px] border border-white/[0.12] bg-[#080a10] shadow-[0_35px_110px_rgba(0,0,0,.82)] sm:h-[88vh] sm:rounded-[36px]"
          >
            <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-red-500/12 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative z-10 border-b border-white/[0.07] bg-[#080a10] p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[11.5px] font-black uppercase tracking-[.18em] text-red-400">
                    {sideLabel}
                  </span>
                  <h2
                    id="mm2-add-weapon-title"
                    className="mt-1 text-2xl font-black tracking-[-.04em] text-white sm:text-4xl"
                  >
                    Add MM2 Weapon
                  </h2>
                  <p className="mt-2 text-xs font-semibold text-[var(--mm2-ink-2)] sm:text-sm">
                    Add as many weapons as you want. This picker stays open until you press X.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-lg font-black text-[var(--mm2-ink-2)] transition hover:bg-white/[0.08] hover:text-white sm:h-12 sm:w-12 sm:rounded-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="mt-5 flex gap-2 overflow-x-auto pb-1 sm:mt-6">
                <FilterButton active={category === "ALL"} onClick={() => setCategory("ALL")}>
                  ✨ All Weapons
                </FilterButton>
                {categories.map((name) => (
                  <FilterButton
                    key={name}
                    active={category === name}
                    onClick={() => setCategory(name)}
                  >
                    {name}
                  </FilterButton>
                ))}
              </div>

              <div className="relative mt-5 sm:mt-6">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-[var(--mm2-ink-3)]">
                  🔍
                </span>
                <input
                  ref={searchInputRef}
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search weapons, categories, or types..."
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-2xl border-2 border-red-400/15 bg-[#0f121a] py-4 pl-14 pr-16 text-lg font-semibold text-white outline-none transition-all placeholder:text-[var(--mm2-ink-3)] focus:border-red-400/45 focus:ring-4 focus:ring-red-500/10"
                />

                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-white/[0.06] font-black text-[var(--mm2-ink-2)] hover:bg-red-500/10 hover:text-red-300"
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-10 text-center">
                <div className="text-6xl text-[var(--mm2-ink-3)] sm:text-8xl" aria-hidden="true">
                  🔍
                </div>
                <h3 className="mt-5 text-2xl font-black text-zinc-200 sm:mt-6 sm:text-3xl">
                  No Weapons Found
                </h3>
                <p className="mt-2 max-w-md text-sm text-[var(--mm2-ink-2)] sm:mt-3 sm:text-base">
                  Try another spelling, category, or switch the calculator value source.
                </p>
              </div>
            ) : (
              <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#080a10]">
                <div className="grid grid-cols-2 items-stretch gap-3 p-3 sm:gap-4 sm:p-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {visibleItems.map((item, index) => {
                    const src = imageUrl(item.IMAGE);
                    const activeValue = valueFor(item, valueSource);
                    const otherValue = valueSource === "SUPREME" ? item.GCASH_VALUE : item.SOURCE_VALUE;
                    const otherLabel = valueSource === "SUPREME" ? "GCash" : "Supreme";
                    const inOfferQuantity =
                      offerQuantities.get(String(item.ID ?? item.NAME)) ?? 0;

                    return (
                      <motion.button
                        type="button"
                        key={item.ID ?? item.NAME}
                        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: shouldReduceMotion ? 0 : 0.25, delay: shouldReduceMotion ? 0 : Math.min(index * 0.015, 0.2) }}
                        whileHover={shouldReduceMotion ? undefined : { y: -5, scale: 1.015 }}
                        whileTap={{ scale: shouldReduceMotion ? 1 : 0.97 }}
                        onClick={() => onSelect(item)}
                        aria-label={`Add ${item.NAME} to the trade`}
                        className="group/card relative flex min-h-[286px] min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0d121b] p-3 text-left shadow-md outline-none transition-[background-color,border-color,box-shadow] duration-300 hover:border-red-400/28 hover:bg-[#121823] hover:shadow-xl focus-visible:border-red-400/50 focus-visible:ring-4 focus-visible:ring-red-500/10 sm:min-h-[318px] sm:rounded-[22px] sm:p-3.5"
                      >
                        <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-red-500/10 opacity-0 blur-3xl transition-opacity duration-300 group-hover/card:opacity-100" />

                        {inOfferQuantity > 0 ? (
                          <div className="absolute right-2 top-2 z-20 rounded-full border border-cyan-300/15 bg-cyan-500/15 px-2 py-1 text-[11px] font-black text-cyan-200 shadow-sm sm:right-3 sm:top-3 sm:text-[11.5px]">
                            IN OFFER ×{inOfferQuantity}
                          </div>
                        ) : null}

                        <div className="absolute left-2 top-2 z-20 rounded-full border border-white/[0.08] bg-black/45 px-2 py-1 text-[11.5px] font-black uppercase tracking-wide text-zinc-300 shadow-sm backdrop-blur sm:left-3 sm:top-3 sm:text-[12px]">
                          {item.CATEGORY ?? "Weapon"}
                        </div>

                        <div className="relative flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br from-[#171d29] via-[#0c1119] to-[#07090d] p-3 shadow-inner sm:h-[118px] sm:rounded-[20px]">
                          {src ? (
                            <MM2WeaponPlate
                              name={item.NAME}
                              category={item.CATEGORY}
                              src={src}
                              size={104}
                              radius={16}
                              className="transition duration-300 group-hover/card:scale-105"
                            />
                          ) : (
                            <span className="text-5xl text-red-300/45">◆</span>
                          )}
                        </div>

                        <h3 className="relative z-10 mt-3 line-clamp-2 min-h-[40px] w-full break-words text-center text-sm font-black leading-snug text-white sm:mt-3.5 sm:min-h-[44px] sm:text-base">
                          {item.NAME}
                        </h3>

                        <p className="relative z-10 mt-1 text-center text-[12px] font-black uppercase tracking-wide text-[var(--mm2-ink-3)] sm:text-xs">
                          Demand {item.DEMAND ?? 0}/10
                        </p>

                        <div className="relative z-10 mt-2 w-full space-y-2 text-[12px] font-bold sm:mt-3 sm:text-xs">
                          <div className="flex items-center justify-between gap-2 rounded-lg bg-red-500/10 px-2 py-2 text-red-200 sm:rounded-xl sm:px-3">
                            <span>{valueSource === "SUPREME" ? "Supreme" : "GCash"}</span>
                            <span className="min-w-0 truncate text-right font-black">
                              {formatValue(activeValue)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.045] px-2 py-2 text-[var(--mm2-ink-2)] sm:rounded-xl sm:px-3">
                            <span>{otherLabel}</span>
                            <span className="min-w-0 truncate text-right font-black">
                              {formatValue(otherValue)}
                            </span>
                          </div>
                        </div>

                        <span className="relative z-10 mt-auto flex w-full items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.055] px-3 py-2.5 text-center text-[12px] font-black text-zinc-200 transition group-hover/card:border-red-400/20 group-hover/card:bg-red-500/12 group-hover/card:text-red-100 sm:text-[11px]">
                          {inOfferQuantity > 0
                            ? `+ Add Another (×${inOfferQuantity})`
                            : "+ Add Weapon"}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                {visibleCount < filteredItems.length ? (
                  <div className="px-4 pb-6 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((count) => count + ITEMS_PER_PAGE)}
                      className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-6 py-3 text-sm font-black text-zinc-200 transition hover:border-red-400/20 hover:bg-red-500/[0.06] hover:text-red-200"
                    >
                      Load more weapons
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-2 text-[12px] font-black transition sm:px-4 sm:text-xs ${
        active
          ? "border-red-400/30 bg-red-500/12 text-red-200"
          : "border-white/[0.08] bg-white/[0.035] text-[var(--mm2-ink-2)] hover:bg-white/[0.06] hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}
