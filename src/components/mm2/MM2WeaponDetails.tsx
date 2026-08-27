import type { ReactNode } from "react";
import Link from "next/link";
import MM2RelatedWeapons from "./MM2RelatedWeapons";

type DemandContext = {
  demand: number | null;
  categoryAverage: number | null;
  categoryRank: number | null;
  categoryRatedCount: number;
  globalRank: number | null;
  globalRatedCount: number;
};

type MM2Item = {
  ID?: string;
  NAME: string;
  IMAGE?: string;
  TYPE?: string;
  CATEGORY?: string;
  SOURCE_VALUE?: number | null;
  GCASH_VALUE?: number | null;
  DEMAND?: number | null;
  SOURCE_NAME?: string | null;
  UPDATED_AT?: string | null;
  LAST_SOURCE_SYNC?: string | null;
  NOTES?: string | null;
};

function formatValue(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("en-US")
    : "N/A";
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function demandLabel(demand: number | null) {
  if (demand === null) return "Unrated";
  if (demand >= 8) return "Very high";
  if (demand >= 6) return "High";
  if (demand >= 4) return "Active";
  if (demand >= 2) return "Moderate";
  return "Low";
}

function categoryTheme(category?: string) {
  switch ((category ?? "").toUpperCase()) {
    case "CHROMA":
      return "from-fuchsia-700 via-red-600 to-cyan-700";
    case "ANCIENT":
      return "from-amber-800 via-red-800 to-zinc-950";
    case "GODLY":
      return "from-rose-700 via-red-800 to-zinc-950";
    case "VINTAGE":
      return "from-amber-700 via-orange-900 to-zinc-950";
    case "UNIQUE":
      return "from-violet-700 via-red-900 to-zinc-950";
    case "LEGENDARY":
      return "from-orange-700 via-red-900 to-zinc-950";
    case "RARE":
      return "from-blue-800 via-red-950 to-zinc-950";
    case "UNCOMMON":
      return "from-emerald-800 via-red-950 to-zinc-950";
    default:
      return "from-red-800 via-rose-950 to-zinc-950";
  }
}

export default function MM2WeaponDetails({
  item,
  image,
  relatedWeapons = [],
  demandContext,
}: {
  item: MM2Item;
  image?: string | null;
  relatedWeapons?: MM2Item[];
  demandContext: DemandContext;
}) {
  const demand = demandContext.demand;
  const source = item.SOURCE_NAME || "Supreme Values";
  const updatedAt = item.LAST_SOURCE_SYNC || item.UPDATED_AT;
  const hasSupreme = typeof item.SOURCE_VALUE === "number";
  const hasGcash = typeof item.GCASH_VALUE === "number";
  const availableValues = Number(hasSupreme) + Number(hasGcash);
  const calculatorHref = `/mm2/calculator?add=${encodeURIComponent(String(item.ID ?? item.NAME))}&source=SUPREME`;
  const demandMarketHref = item.CATEGORY
    ? `/mm2/demand?category=${encodeURIComponent(item.CATEGORY)}`
    : "/mm2/demand";

  return (
    <section className="overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#090b11]/95 shadow-[0_26px_90px_rgba(0,0,0,.42)]">
      {/* Adopt Me-style profile hero, reskinned for MM2 */}
      <div className={`bg-gradient-to-br ${categoryTheme(item.CATEGORY)} px-5 py-7 text-white sm:px-8 sm:py-10`}>
        <Link
          href="/mm2/values"
          className="inline-flex rounded-full border border-white/15 bg-black/20 px-4 py-2 text-xs font-black backdrop-blur transition hover:bg-black/30"
        >
          ← All weapon values
        </Link>

        <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:text-left">
          <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-[28px] border border-white/15 bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-sm sm:h-48 sm:w-48">
            {image ? (
              <img
                src={image}
                alt={item.NAME}
                className="h-full w-full object-contain drop-shadow-[0_16px_28px_rgba(0,0,0,.55)]"
              />
            ) : (
              <span className="text-6xl text-white/45">◆</span>
            )}
          </div>

          <div className="min-w-0 text-center sm:text-left">
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                {item.CATEGORY || "Weapon"}
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                {demand === null ? "Demand unrated" : `Demand ${demand}/10`}
              </span>
              {item.TYPE ? (
                <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                  {item.TYPE}
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 break-words text-3xl font-black tracking-[-.05em] sm:text-5xl">
              {item.NAME}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/85">
              Compare its listed values, inspect the current demand signal, verify the data source, and discover nearby MM2 weapons.
            </p>
            <p className="mt-3 text-xs font-bold text-white/60">
              Last data refresh: {formatDate(updatedAt)}
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Link
                href={calculatorHref}
                className="inline-flex min-h-11 items-center rounded-2xl bg-white px-4 text-xs font-black text-zinc-950 transition hover:bg-red-100"
              >
                + Add to Trade Calculator
              </Link>
              <Link
                href={demandMarketHref}
                className="inline-flex min-h-11 items-center rounded-2xl border border-white/20 bg-black/20 px-4 text-xs font-black text-white transition hover:bg-black/30"
              >
                View Demand Market →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-7">
        {/* Same hierarchy as Adopt Me's regular-value summary */}
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryCard
            label="Supreme Value"
            value={formatValue(item.SOURCE_VALUE)}
            note={source}
          />
          <SummaryCard
            label="GCash Value"
            value={formatValue(item.GCASH_VALUE)}
            note={hasGcash ? "CSBT listed value" : "Not listed in this dataset"}
          />
        </div>

        {/* Value Health mirrors the Adopt Me detail page's trust/provenance layer */}
        <section
          className="mt-5 rounded-[24px] border border-red-400/10 bg-red-400/[0.035] p-4 sm:p-5"
          aria-labelledby="mm2-value-health-title"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-red-300">
                Value Health
              </p>
              <h2 id="mm2-value-health-title" className="mt-1 text-lg font-black text-white">
                How complete is this snapshot?
              </h2>
            </div>
            <span className="rounded-full border border-white/[0.07] bg-white/[0.04] px-3 py-1.5 text-[10px] font-black text-zinc-300">
              {availableValues}/2 listed values
            </span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <HealthMetric label="Last verified" value={formatDate(updatedAt)} />
            <HealthMetric
              label="Demand signal"
              value={demand === null ? "Unrated" : `${demand}/10 · ${demandLabel(demand)}`}
            />
            <HealthMetric label="Category" value={item.CATEGORY || "Unknown"} />
            <HealthMetric label="Value source" value={source} />
          </div>

          <p className="mt-4 text-xs font-semibold leading-5 text-zinc-500">
            <strong className="text-zinc-300">Provenance:</strong> CSBT displays the values already present in its MM2 dataset. Missing fields remain N/A and are not estimated.
          </p>
        </section>

        {/* Adopt Me equivalent: Value breakdown */}
        <div className="mt-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">
              Value breakdown
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-[-.035em] text-white">
              Current weapon values
            </h2>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ValueCard
              eyebrow="Supreme"
              value={formatValue(item.SOURCE_VALUE)}
              available={hasSupreme}
            />
            <ValueCard
              eyebrow="GCash"
              value={formatValue(item.GCASH_VALUE)}
              available={hasGcash}
            />
          </div>
        </div>

        {/* MM2 equivalent to the supporting market/profile section */}
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.08fr_.92fr]">
          <InfoSection title="Demand profile" eyebrow="Trading signal">
            <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black uppercase tracking-[.12em] text-zinc-500">
                  Current demand
                </span>
                <strong className="text-sm font-black text-white">
                  {demand === null ? "Unrated" : `${demand}/10 · ${demandLabel(demand)}`}
                </strong>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-600 to-rose-400"
                  style={{ width: `${demand === null ? 0 : Math.max(4, Math.min(100, demand * 10))}%` }}
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <DemandMetric
                label="Category average"
                value={
                  demandContext.categoryAverage === null
                    ? "N/A"
                    : `${demandContext.categoryAverage.toFixed(1)}/10`
                }
              />
              <DemandMetric
                label="Category rank"
                value={
                  demandContext.categoryRank
                    ? `#${demandContext.categoryRank} of ${demandContext.categoryRatedCount}`
                    : "Unrated"
                }
              />
              <DemandMetric
                label="Global rank"
                value={
                  demandContext.globalRank
                    ? `#${demandContext.globalRank} of ${demandContext.globalRatedCount}`
                    : "Unrated"
                }
              />
              <DemandMetric label="Demand tier" value={demandLabel(demand)} />
            </div>

            {demand !== null && demandContext.categoryAverage !== null ? (
              <p className="rounded-2xl border border-white/[0.055] bg-white/[0.02] px-4 py-3 text-xs font-semibold leading-5 text-zinc-500">
                <strong className="text-zinc-300">Category position:</strong>{" "}
                {Math.abs(demand - demandContext.categoryAverage) < 0.05
                  ? `About equal to the ${item.CATEGORY ?? "category"} average.`
                  : demand > demandContext.categoryAverage
                    ? `${(demand - demandContext.categoryAverage).toFixed(1)} demand points above the ${item.CATEGORY ?? "category"} average.`
                    : `${(demandContext.categoryAverage - demand).toFixed(1)} demand points below the ${item.CATEGORY ?? "category"} average.`}
              </p>
            ) : null}

            <Link
              href={demandMarketHref}
              className="flex min-h-11 items-center justify-center rounded-2xl border border-red-400/15 bg-red-500/[0.055] px-4 text-xs font-black text-red-200 transition hover:bg-red-500/[0.09]"
            >
              Compare in Demand Intelligence →
            </Link>
          </InfoSection>

          <InfoSection title="Weapon information" eyebrow="Profile">
            <InfoRow label="Name" value={item.NAME} />
            <InfoRow label="Category / rarity" value={item.CATEGORY || "Unknown"} />
            <InfoRow label="Type" value={item.TYPE || "Not specified"} />
            <InfoRow label="Source" value={source} />
          </InfoSection>
        </div>

        {/* No fake history: explicit availability state instead */}
        <section className="mt-8 rounded-[24px] border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-zinc-500">
            Value history
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black tracking-[-.03em] text-white">
                Historical tracking
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
                Historical MM2 value points are not stored in the current dataset, so CSBT does not fabricate a trend line for this weapon.
              </p>
            </div>
            <span className="rounded-full border border-white/[0.07] bg-black/20 px-3 py-2 text-[10px] font-black uppercase tracking-[.12em] text-zinc-500">
              No history available
            </span>
          </div>
        </section>

        <MM2RelatedWeapons weapons={relatedWeapons} />

        <div className="mt-7 rounded-2xl border border-white/[0.07] bg-black/20 p-4 text-xs leading-6 text-zinc-500">
          Values can change as the source dataset is refreshed. Use this page as a current reference and verify the latest trade context before finalizing a trade.
        </div>

        <div className="mt-7 flex flex-wrap gap-3 border-t border-white/[0.06] pt-6">
          <Link
            href={calculatorHref}
            className="inline-flex min-h-11 items-center rounded-2xl bg-red-600 px-5 text-xs font-black text-white transition hover:bg-red-500"
          >
            + Add to Calculator
          </Link>
          <Link
            href={demandMarketHref}
            className="inline-flex min-h-11 items-center rounded-2xl border border-red-400/15 bg-red-500/[0.045] px-5 text-xs font-black text-red-200 transition hover:bg-red-500/[0.08]"
          >
            View Demand Market
          </Link>
          <Link
            href="/mm2/values"
            className="inline-flex min-h-11 items-center rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 text-xs font-black text-zinc-200 transition hover:bg-white/[0.06]"
          >
            Search another weapon
          </Link>
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.025] p-5">
      <p className="text-[10px] font-black uppercase tracking-[.14em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black tracking-[-.04em] text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-zinc-600">{note}</p>
    </div>
  );
}

function HealthMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-3.5">
      <p className="text-[9px] font-black uppercase tracking-[.12em] text-zinc-600">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-black text-zinc-200">{value}</p>
    </div>
  );
}

function ValueCard({
  eyebrow,
  value,
  available,
}: {
  eyebrow: string;
  value: string;
  available: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-white/[0.08] bg-[#0d1018] p-5 text-center">
      <p className="text-[10px] font-black uppercase tracking-[.15em] text-red-300">
        {eyebrow}
      </p>
      <p className={`mt-3 text-3xl font-black tracking-[-.04em] ${available ? "text-white" : "text-zinc-600"}`}>
        {value}
      </p>
      <p className="mt-2 text-[11px] font-bold text-zinc-600">
        {available ? "Listed in current MM2 data" : "Not available"}
      </p>
    </div>
  );
}

function DemandMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-3.5">
      <p className="text-[8px] font-black uppercase tracking-[.11em] text-zinc-700">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-black text-zinc-200">{value}</p>
    </div>
  );
}

function InfoSection({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6">
      <p className="text-[10px] font-black uppercase tracking-[.16em] text-red-300">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-xl font-black tracking-[-.03em] text-white">
        {title}
      </h2>
      <div className="mt-4 space-y-2">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-black/20 px-4 py-3">
      <span className="text-sm font-semibold text-zinc-500">{label}</span>
      <strong className="text-sm font-black text-zinc-200">{value}</strong>
    </div>
  );
}
