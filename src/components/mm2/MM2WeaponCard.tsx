import Link from "next/link";
import MM2WeaponPlate from "./MM2WeaponPlate";
import { mm2RarityTone } from "../../lib/mm2/rarity";

// Nullable value/demand fields match the generated mm2Items.json shape.
type Item = {
  ID?: string;
  NAME: string;
  CATEGORY?: string;
  SOURCE_VALUE?: number | null;
  GCASH_VALUE?: number | null;
  DEMAND?: number | string | null;
  IMAGE?: string;
};

function formatValue(value?: number | null) {
  return typeof value === "number" ? value.toLocaleString() : "N/A";
}

function demandNumber(value: Item["DEMAND"]) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function demandTone(value: Item["DEMAND"]) {
  const demand = demandNumber(value);
  if (demand === null) return "border-white/[0.07] bg-black/25 text-[var(--mm2-ink-4)]";
  if (demand >= 8) return "border-[rgba(226,52,74,.30)] bg-[rgba(226,52,74,.10)] text-[#f0919b]";
  if (demand >= 6) return "border-[rgba(206,74,58,.26)] bg-[rgba(206,74,58,.08)] text-[#dfa598]";
  if (demand >= 4) return "border-[rgba(180,140,70,.24)] bg-[rgba(180,140,70,.08)] text-[#d3bc90]";
  if (demand >= 2) return "border-[rgba(96,124,178,.24)] bg-[rgba(96,124,178,.08)] text-[#adbcd8]";
  return "border-white/[0.08] bg-white/[0.03] text-[var(--mm2-ink-3)]";
}

function imageUrl(image?: string) {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  const clean = image.replace(/^\.\.\//, "/").replace(/^\/+/, "/");
  return `https://supremevalues.com${clean}`;
}

export default function MM2WeaponCard({ item }: { item: Item }) {
  const slug = encodeURIComponent(item.ID ?? item.NAME);
  const image = imageUrl(item.IMAGE);
  const demand = demandNumber(item.DEMAND);
  const calculatorKey = String(item.ID ?? item.NAME);
  const tone = mm2RarityTone(item.CATEGORY);

  // A 1,000,000-value Godly used to render exactly like an 11-value Common.
  // Higher tiers get a lit top rail and a stronger resting edge — presence from
  // light, not from a louder card.
  const featured = tone.rank >= 3;

  return (
    <article
      className="group relative overflow-hidden rounded-[18px] border bg-[var(--mm2-panel)] shadow-[0_10px_32px_rgba(0,0,0,.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--mm2-riser)]"
      style={{ borderColor: featured ? tone.border : "rgba(255,255,255,.07)" }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, ${tone.edge}, transparent ${featured ? "62%" : "34%"})`,
          opacity: featured ? 1 : 0.5,
        }}
      />

      <div className="flex min-w-0 items-center gap-3.5 p-3.5">
        <Link
          href={`/mm2/values/${slug}`}
          className="shrink-0 rounded-[15px] outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--mm2-crimson)]"
          tabIndex={-1}
          aria-hidden="true"
        >
          <MM2WeaponPlate
            name={item.NAME}
            category={item.CATEGORY}
            src={image}
            size={76}
            className="transition duration-300 group-hover:scale-[1.03]"
          />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2.5">
            <div className="min-w-0">
              <Link
                href={`/mm2/values/${slug}`}
                className="block truncate text-[15px] font-black tracking-[-.01em] text-white transition hover:text-[#f0919b]"
              >
                {item.NAME}
              </Link>
              <span
                className="mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[.08em]"
                style={{ borderColor: tone.border, background: tone.chip, color: tone.chipInk }}
              >
                {item.CATEGORY || "Weapon"}
              </span>
            </div>

            <Link
              href={`/mm2/demand?q=${encodeURIComponent(item.NAME)}`}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[.05em] transition hover:brightness-125 ${demandTone(item.DEMAND)}`}
              title="Open this weapon in Demand Intelligence"
            >
              {demand === null ? "Unrated" : `${demand}/10`}
            </Link>
          </div>

          <div className="mt-2.5 flex items-end gap-4">
            <span className="min-w-0">
              <small className="block text-[10px] font-black uppercase tracking-[.1em] text-[var(--mm2-ink-4)]">
                Supreme
              </small>
              <strong className="mt-0.5 block truncate text-[19px] font-black leading-none tabular-nums tracking-[-.03em] text-white">
                {formatValue(item.SOURCE_VALUE)}
              </strong>
            </span>
            <span className="min-w-0 border-l border-white/[0.08] pl-4">
              <small className="block text-[10px] font-black uppercase tracking-[.1em] text-[var(--mm2-ink-4)]">
                GCash
              </small>
              <strong className="mt-0.5 block truncate text-[15px] font-black leading-none tabular-nums tracking-[-.02em] text-[var(--mm2-ink-2)]">
                {formatValue(item.GCASH_VALUE)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 border-t border-white/[0.055]">
        <Link
          href={`/mm2/values/${slug}`}
          className="flex min-h-11 items-center justify-center border-r border-white/[0.055] text-[11px] font-black text-[var(--mm2-ink-3)] transition hover:bg-white/[0.03] hover:text-white"
        >
          Profile
        </Link>
        <Link
          href={`/mm2/demand?q=${encodeURIComponent(item.NAME)}`}
          className="flex min-h-11 items-center justify-center border-r border-white/[0.055] text-[11px] font-black text-[var(--mm2-ink-3)] transition hover:bg-white/[0.03] hover:text-white"
        >
          Demand
        </Link>
        <Link
          href={`/mm2/calculator?add=${encodeURIComponent(calculatorKey)}&source=SUPREME`}
          className="flex min-h-11 items-center justify-center text-[11px] font-black text-[#f0919b] transition hover:bg-[rgba(226,52,74,.07)] hover:text-white"
        >
          + Trade
        </Link>
      </div>
    </article>
  );
}
