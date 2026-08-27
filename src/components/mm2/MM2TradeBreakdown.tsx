"use client";

import type {
  MM2SelectedTradeItem,
  MM2ValueSource,
} from "./MM2TradeTypes";

function getItemValue(
  selected: MM2SelectedTradeItem,
  source: MM2ValueSource,
) {
  const value =
    source === "SUPREME"
      ? selected.item.SOURCE_VALUE
      : selected.item.GCASH_VALUE;

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatValue(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/A";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function sideStats(
  items: MM2SelectedTradeItem[],
  source: MM2ValueSource,
) {
  let quantity = 0;
  let demandWeighted = 0;
  let pricedQuantity = 0;
  let missingQuantity = 0;

  for (const selected of items) {
    const q = Math.max(1, selected.quantity);
    quantity += q;
    demandWeighted += (selected.item.DEMAND ?? 0) * q;

    if (getItemValue(selected, source) === null) {
      missingQuantity += q;
    } else {
      pricedQuantity += q;
    }
  }

  return {
    quantity,
    averageDemand: quantity ? demandWeighted / quantity : null,
    pricedQuantity,
    missingQuantity,
  };
}

export default function MM2TradeBreakdown({
  yourItems,
  theirItems,
  yourTotal,
  theirTotal,
  valueSource,
}: {
  yourItems: MM2SelectedTradeItem[];
  theirItems: MM2SelectedTradeItem[];
  yourTotal: number;
  theirTotal: number;
  valueSource: MM2ValueSource;
}) {
  const yourStats = sideStats(yourItems, valueSource);
  const theirStats = sideStats(theirItems, valueSource);

  const difference = Math.abs(theirTotal - yourTotal);
  const baseline = Math.max(yourTotal, theirTotal, 1);
  const valueGap = (difference / baseline) * 100;

  const yourDemand = yourStats.averageDemand;
  const theirDemand = theirStats.averageDemand;
  const demandGap =
    yourDemand === null || theirDemand === null
      ? null
      : Math.abs(theirDemand - yourDemand);

  return (
    <section className="mt-5 rounded-[24px] border border-white/[0.08] bg-[#090d14] p-4 sm:mt-6 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[.17em] text-red-300">
            Deterministic breakdown
          </p>
          <h2 className="mt-1 text-xl font-black tracking-[-.03em] text-white">
            See exactly what makes up the trade.
          </h2>
          <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-zinc-600">
            Values, quantities, and demand come directly from the selected MM2
            weapons. Demand is context only and never changes W/F/L.
          </p>
        </div>

        <span className="w-fit rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.11em] text-zinc-500">
          {valueSource} breakdown
        </span>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_230px_minmax(0,1fr)]">
        <BreakdownSide
          title="Your Offer"
          items={yourItems}
          total={yourTotal}
          valueSource={valueSource}
          averageDemand={yourStats.averageDemand}
          missingQuantity={yourStats.missingQuantity}
          accent="amber"
        />

        <div className="rounded-[20px] border border-white/[0.07] bg-black/20 p-4">
          <p className="text-center text-[9px] font-black uppercase tracking-[.14em] text-zinc-600">
            Trade Context
          </p>

          <div className="mt-3 space-y-2">
            <ContextMetric
              label="Value gap"
              value={`${valueGap.toFixed(1)}%`}
            />
            <ContextMetric
              label="Difference"
              value={formatValue(difference)}
            />
            <ContextMetric
              label="Demand gap"
              value={
                demandGap === null ? "N/A" : `${demandGap.toFixed(1)}/10`
              }
            />
          </div>

          <div className="mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 text-center">
            <span className="block text-[8px] font-black uppercase tracking-[.12em] text-zinc-700">
              Higher demand side
            </span>
            <strong className="mt-1 block text-xs font-black text-zinc-300">
              {yourDemand === null || theirDemand === null
                ? "Not enough data"
                : Math.abs(yourDemand - theirDemand) < 0.05
                  ? "About equal"
                  : yourDemand > theirDemand
                    ? "Your offer"
                    : "Their offer"}
            </strong>
          </div>
        </div>

        <BreakdownSide
          title="Their Offer"
          items={theirItems}
          total={theirTotal}
          valueSource={valueSource}
          averageDemand={theirStats.averageDemand}
          missingQuantity={theirStats.missingQuantity}
          accent="cyan"
        />
      </div>
    </section>
  );
}

function BreakdownSide({
  title,
  items,
  total,
  valueSource,
  averageDemand,
  missingQuantity,
  accent,
}: {
  title: string;
  items: MM2SelectedTradeItem[];
  total: number;
  valueSource: MM2ValueSource;
  averageDemand: number | null;
  missingQuantity: number;
  accent: "amber" | "cyan";
}) {
  const accentClass =
    accent === "amber"
      ? "border-amber-400/12 bg-amber-400/[0.025]"
      : "border-cyan-400/12 bg-cyan-400/[0.025]";

  return (
    <article className={`rounded-[20px] border p-3.5 ${accentClass}`}>
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div>
          <h3 className="text-sm font-black text-white">{title}</h3>
          <p className="mt-1 text-[9px] font-bold text-zinc-600">
            Avg demand{" "}
            {averageDemand === null ? "N/A" : `${averageDemand.toFixed(1)}/10`}
          </p>
        </div>

        <div className="text-right">
          <span className="block text-[8px] font-black uppercase tracking-[.1em] text-zinc-700">
            Total
          </span>
          <strong className="mt-1 block text-sm font-black text-white">
            {formatValue(total)}
          </strong>
        </div>
      </div>

      <div className="mt-2 max-h-[250px] space-y-1.5 overflow-y-auto pr-1">
        {items.length ? (
          items.map((selected) => {
            const unit = getItemValue(selected, valueSource);
            const subtotal =
              unit === null
                ? null
                : unit * Math.max(1, selected.quantity);

            return (
              <div
                key={selected.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-xl bg-black/20 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <strong className="block truncate text-[11px] font-black text-zinc-200">
                    {selected.quantity}× {selected.item.NAME}
                  </strong>
                  <span className="mt-0.5 block truncate text-[9px] font-bold text-zinc-600">
                    {formatValue(unit)} each · Demand{" "}
                    {selected.item.DEMAND ?? 0}/10
                  </span>
                </div>

                <strong
                  className={`self-center text-[10px] font-black ${
                    subtotal === null ? "text-amber-300" : "text-zinc-300"
                  }`}
                >
                  {formatValue(subtotal)}
                </strong>
              </div>
            );
          })
        ) : (
          <div className="flex min-h-[106px] items-center justify-center text-center">
            <p className="text-[10px] font-semibold text-zinc-700">
              No weapons on this side yet.
            </p>
          </div>
        )}
      </div>

      {missingQuantity > 0 ? (
        <p className="mt-2 rounded-xl border border-orange-400/10 bg-orange-400/[0.04] px-3 py-2 text-[9px] font-bold text-orange-300">
          {missingQuantity} selected item
          {missingQuantity === 1 ? "" : "s"} missing {valueSource} value.
        </p>
      ) : null}
    </article>
  );
}

function ContextMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.025] px-3 py-2.5">
      <span className="text-[9px] font-bold text-zinc-600">{label}</span>
      <strong className="text-[10px] font-black text-zinc-300">{value}</strong>
    </div>
  );
}
