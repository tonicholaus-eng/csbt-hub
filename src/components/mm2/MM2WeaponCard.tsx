import Link from "next/link";

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

function demandLabel(value: Item["DEMAND"]) {
  const demand = demandNumber(value);
  if (demand === null) return "Unrated";
  if (demand >= 8) return "Very High";
  if (demand >= 6) return "High";
  if (demand >= 4) return "Active";
  if (demand >= 2) return "Moderate";
  return "Low";
}

function demandTone(value: Item["DEMAND"]) {
  const demand = demandNumber(value);
  if (demand === null) return "border-white/[0.07] bg-black/20 text-zinc-600";
  if (demand >= 8) return "border-red-400/22 bg-red-500/[0.07] text-red-200";
  if (demand >= 6) return "border-orange-400/18 bg-orange-500/[0.06] text-orange-200";
  if (demand >= 4) return "border-amber-400/18 bg-amber-500/[0.055] text-amber-200";
  if (demand >= 2) return "border-cyan-400/16 bg-cyan-500/[0.05] text-cyan-200";
  return "border-white/[0.08] bg-white/[0.03] text-zinc-400";
}

function imageUrl(image?: string) {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  const clean = image.replace(/^\.\.\//, "/").replace(/^\/+/, "/");
  return `https://supremevalues.com${clean}`;
}

function rarityTone(category?: string) {
  switch ((category || "").toUpperCase()) {
    case "CHROMA":
      return "border-fuchsia-400/20 bg-fuchsia-500/[0.05] text-fuchsia-200";
    case "ANCIENT":
      return "border-red-400/20 bg-red-500/[0.05] text-red-200";
    case "GODLY":
      return "border-rose-400/20 bg-rose-500/[0.05] text-rose-200";
    case "VINTAGE":
      return "border-amber-400/20 bg-amber-500/[0.05] text-amber-200";
    case "UNIQUE":
      return "border-cyan-400/20 bg-cyan-500/[0.05] text-cyan-200";
    default:
      return "border-white/[0.08] bg-white/[0.035] text-zinc-300";
  }
}

export default function MM2WeaponCard({ item }: { item: Item }) {
  const slug = encodeURIComponent(item.NAME);
  const image = imageUrl(item.IMAGE);
  const demand = demandNumber(item.DEMAND);
  const calculatorKey = String(item.ID ?? item.NAME);

  return (
    <article className="group overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#0b0c12]/95 shadow-[0_10px_32px_rgba(0,0,0,.16)] transition duration-200 hover:-translate-y-0.5 hover:border-red-400/26 hover:bg-[#0d0e15]">
      <div className="flex min-w-0 items-center gap-3 p-3">
        <Link
          href={`/mm2/values/${slug}`}
          className={`flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-[15px] border ${rarityTone(item.CATEGORY)}`}
        >
          {image ? (
            <img
              src={image}
              alt=""
              loading="lazy"
              className="h-[68px] w-[68px] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,.45)] transition duration-300 group-hover:scale-105"
            />
          ) : (
            <span className="text-2xl text-zinc-600">✦</span>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/mm2/values/${slug}`}
                className="block truncate text-sm font-black text-white transition hover:text-red-200"
              >
                {item.NAME}
              </Link>
              <span className="mt-1 block truncate text-[9px] font-bold uppercase tracking-[0.08em] text-zinc-600">
                {item.CATEGORY || "Weapon"}
              </span>
            </div>

            <Link
              href={`/mm2/demand?q=${encodeURIComponent(item.NAME)}`}
              className={`shrink-0 rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-[.08em] transition hover:brightness-125 ${demandTone(item.DEMAND)}`}
              title="Open this weapon in Demand Intelligence"
            >
              {demand === null ? "Unrated" : `${demand}/10 ${demandLabel(item.DEMAND)}`}
            </Link>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] font-black">
            <span className="min-w-0 rounded-[9px] bg-white/[0.045] px-2 py-1.5 text-zinc-200">
              <small className="mr-1 font-black uppercase text-zinc-600">SV</small>
              {formatValue(item.SOURCE_VALUE)}
            </span>
            <span className="min-w-0 rounded-[9px] bg-white/[0.045] px-2 py-1.5 text-zinc-200">
              <small className="mr-1 font-black uppercase text-zinc-600">GC</small>
              {formatValue(item.GCASH_VALUE)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 border-t border-white/[0.055]">
        <Link
          href={`/mm2/values/${slug}`}
          className="flex min-h-10 items-center justify-center border-r border-white/[0.055] text-[8px] font-black text-zinc-600 transition hover:bg-white/[0.025] hover:text-white"
        >
          Profile
        </Link>
        <Link
          href={`/mm2/demand?q=${encodeURIComponent(item.NAME)}`}
          className="flex min-h-10 items-center justify-center border-r border-white/[0.055] text-[8px] font-black text-cyan-300/75 transition hover:bg-cyan-500/[0.04] hover:text-cyan-200"
        >
          Demand Intel
        </Link>
        <Link
          href={`/mm2/calculator?add=${encodeURIComponent(calculatorKey)}&source=SUPREME`}
          className="flex min-h-10 items-center justify-center text-[8px] font-black text-red-300 transition hover:bg-red-500/[0.05] hover:text-red-200"
        >
          + Trade
        </Link>
      </div>
    </article>
  );
}
