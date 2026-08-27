"use client";

import { FAIR_THRESHOLD_PERCENT } from "../../lib/trade/verdict";
import type {
  MM2Item,
  MM2SelectedTradeItem,
  MM2ValueSource,
} from "./MM2TradeTypes";

type Side = "your" | "their";

type Suggestion = {
  item: MM2Item;
  value: number;
  resultingDifference: number;
  resultingPercent: number;
  fairAfterAdd: boolean;
};

function itemValue(item: MM2Item, source: MM2ValueSource) {
  const value =
    source === "SUPREME" ? item.SOURCE_VALUE : item.GCASH_VALUE;

  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function formatValue(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function selectedKey(item: MM2Item) {
  return String(item.ID ?? item.NAME).trim().toLowerCase();
}

export default function MM2TradeBalanceFinder({
  catalog,
  yourItems,
  theirItems,
  yourTotal,
  theirTotal,
  valueSource,
  missingCount,
  onAddSuggested,
}: {
  catalog: MM2Item[];
  yourItems: MM2SelectedTradeItem[];
  theirItems: MM2SelectedTradeItem[];
  yourTotal: number;
  theirTotal: number;
  valueSource: MM2ValueSource;
  missingCount: number;
  onAddSuggested: (side: Side, item: MM2Item) => void;
}) {
  const hasBothSides = yourItems.length > 0 && theirItems.length > 0;
  const targetSide: Side =
    yourTotal <= theirTotal ? "your" : "their";

  const lowerTotal =
    targetSide === "your" ? yourTotal : theirTotal;
  const higherTotal =
    targetSide === "your" ? theirTotal : yourTotal;

  const difference = Math.max(0, higherTotal - lowerTotal);
  const baseline = Math.max(higherTotal, lowerTotal, 1);
  const currentPercent = (difference / baseline) * 100;

  const alreadyFair = hasBothSides && currentPercent <= FAIR_THRESHOLD_PERCENT;

  const selectedKeys = new Set(
    [...yourItems, ...theirItems].map((entry) =>
      selectedKey(entry.item),
    ),
  );

  const suggestions: Suggestion[] = hasBothSides && missingCount === 0 && !alreadyFair
    ? catalog
        .flatMap((item) => {
          const value = itemValue(item, valueSource);
          if (value === null) return [];
          if (selectedKeys.has(selectedKey(item))) return [];

          const newLowerTotal = lowerTotal + value;
          const resultingDifference = Math.abs(
            higherTotal - newLowerTotal,
          );
          const resultingBaseline = Math.max(
            higherTotal,
            newLowerTotal,
            1,
          );
          const resultingPercent =
            (resultingDifference / resultingBaseline) * 100;

          return [{
            item,
            value,
            resultingDifference,
            resultingPercent,
            fairAfterAdd: resultingPercent <= FAIR_THRESHOLD_PERCENT,
          }];
        })
        .sort(
          (a, b) =>
            Number(b.fairAfterAdd) - Number(a.fairAfterAdd) ||
            a.resultingPercent - b.resultingPercent ||
            a.resultingDifference - b.resultingDifference ||
            a.item.NAME.localeCompare(b.item.NAME),
        )
        .slice(0, 6)
    : [];

  if (!hasBothSides) {
    return (
      <section className="mt-5 rounded-[24px] border border-white/[0.08] bg-[#090d14] p-4 sm:mt-6 sm:p-5">
        <p className="text-[11.5px] font-black uppercase tracking-[.17em] text-red-300">
          Balance Finder
        </p>
        <h2 className="mt-1 text-xl font-black tracking-[-.03em] text-white">
          Complete both sides first.
        </h2>
        <p className="mt-1 text-xs font-semibold text-[var(--mm2-ink-3)]">
          Once both offers have weapons, CSBT can deterministically search the
          MM2 catalog for items that bring the trade closer to fair.
        </p>
      </section>
    );
  }

  if (missingCount > 0) {
    return (
      <section className="mt-5 rounded-[24px] border border-orange-400/10 bg-orange-400/[0.025] p-4 sm:mt-6 sm:p-5">
        <p className="text-[11.5px] font-black uppercase tracking-[.17em] text-orange-300">
          Balance Finder
        </p>
        <h2 className="mt-1 text-xl font-black tracking-[-.03em] text-white">
          Suggestions paused.
        </h2>
        <p className="mt-1 text-xs font-semibold text-[var(--mm2-ink-3)]">
          One or more selected weapons are missing the active {valueSource}
          value. CSBT will not suggest balancing items from incomplete totals.
        </p>
      </section>
    );
  }

  if (alreadyFair) {
    return (
      <section className="mt-5 rounded-[24px] border border-emerald-400/12 bg-emerald-400/[0.025] p-4 sm:mt-6 sm:p-5">
        <p className="text-[11.5px] font-black uppercase tracking-[.17em] text-emerald-300">
          Balance Finder
        </p>
        <h2 className="mt-1 text-xl font-black tracking-[-.03em] text-white">
          This trade is already inside the fair band.
        </h2>
        <p className="mt-1 text-xs font-semibold text-[var(--mm2-ink-3)]">
          The current value gap is {currentPercent.toFixed(1)}%. No balancing
          weapon is required based on the calculator&apos;s 5% fair threshold.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-5 overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#090d14] sm:mt-6">
      <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div>
          <p className="text-[11.5px] font-black uppercase tracking-[.17em] text-red-300">
            Balance Finder
          </p>
          <h2 className="mt-1 text-xl font-black tracking-[-.03em] text-white">
            What could make this trade closer?
          </h2>
          <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-[var(--mm2-ink-3)]">
            {targetSide === "your" ? "Your Offer" : "Their Offer"} is lower by{" "}
            {formatValue(difference)}. These are the closest real weapons in the
            active {valueSource} dataset.
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-black/20 px-3 py-2 text-right">
          <span className="block text-[11px] font-black uppercase tracking-[.12em] text-[var(--mm2-ink-3)]">
            Current gap
          </span>
          <strong className="mt-0.5 block text-sm font-black text-white">
            {currentPercent.toFixed(1)}%
          </strong>
        </div>
      </div>

      {suggestions.length ? (
        <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
          {suggestions.map((suggestion) => (
            <article
              key={suggestion.item.ID ?? suggestion.item.NAME}
              className={`rounded-[18px] border p-3 ${
                suggestion.fairAfterAdd
                  ? "border-emerald-400/15 bg-emerald-400/[0.025]"
                  : "border-white/[0.07] bg-white/[0.025]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[11px] font-black uppercase tracking-[.12em] text-red-300">
                    {suggestion.item.CATEGORY ?? "Weapon"}
                  </span>
                  <h3 className="mt-1 truncate text-sm font-black text-white">
                    {suggestion.item.NAME}
                  </h3>
                </div>

                {suggestion.fairAfterAdd ? (
                  <span className="shrink-0 rounded-full border border-emerald-400/15 bg-emerald-400/[0.08] px-2 py-1 text-[11px] font-black text-emerald-300">
                    FAIR
                  </span>
                ) : null}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <MiniStat
                  label={valueSource}
                  value={formatValue(suggestion.value)}
                />
                <MiniStat
                  label="Demand"
                  value={`${suggestion.item.DEMAND ?? 0}/10`}
                />
              </div>

              <div className="mt-2 rounded-xl bg-black/20 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black uppercase tracking-[.1em] text-[var(--mm2-ink-3)]">
                    Gap after adding
                  </span>
                  <strong
                    className={`text-[12px] font-black ${
                      suggestion.fairAfterAdd
                        ? "text-emerald-300"
                        : "text-zinc-300"
                    }`}
                  >
                    {suggestion.resultingPercent.toFixed(1)}%
                  </strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onAddSuggested(targetSide, suggestion.item)
                }
                className="mt-3 flex min-h-10 w-full items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.045] text-[12px] font-black text-zinc-200 transition hover:border-red-400/15 hover:bg-red-500/[0.08] hover:text-red-100"
              >
                + Add to{" "}
                {targetSide === "your" ? "Your Offer" : "Their Offer"}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="p-5 text-center">
          <strong className="text-sm font-black text-zinc-300">
            No balancing suggestions available.
          </strong>
          <p className="mt-1 text-xs font-semibold text-[var(--mm2-ink-3)]">
            The active value source does not contain a usable nearby-value
            weapon outside the current trade.
          </p>
        </div>
      )}

      <div className="border-t border-white/[0.06] px-4 py-3 text-[11.5px] font-semibold leading-5 text-[var(--mm2-ink-3)] sm:px-5">
        Suggestions are mathematical matches only. Demand and personal
        preference can still affect whether the real trade is desirable.
      </div>
    </section>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-black/20 px-3 py-2.5">
      <span className="block text-[11px] font-black uppercase tracking-[.1em] text-[var(--mm2-ink-3)]">
        {label}
      </span>
      <strong className="mt-1 block truncate text-[12px] font-black text-zinc-300">
        {value}
      </strong>
    </div>
  );
}
