import Link from "next/link";

type MM2Item = {
  ID?: string;
  NAME: string;
  IMAGE?: string;
  CATEGORY?: string;
  SOURCE_VALUE?: number | null;
  GCASH_VALUE?: number | null;
  DEMAND?: number | null;
};

function imageUrl(item: MM2Item) {
  if (!item.IMAGE) return null;
  if (/^https?:\/\//i.test(item.IMAGE)) return item.IMAGE;
  const clean = item.IMAGE.replace(/^\.\.\//, "/").replace(/^\/+/, "/");
  return `https://supremevalues.com${clean}`;
}

function formatValue(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("en-US")
    : "N/A";
}

export default function MM2RelatedWeapons({ weapons }: { weapons: MM2Item[] }) {
  if (!weapons.length) return null;

  return (
    <section className="mt-8" aria-labelledby="related-weapons-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">
            Discovery
          </p>
          <h2
            id="related-weapons-title"
            className="mt-1 text-xl font-black tracking-[-.03em] text-white"
          >
            Similar-value weapons
          </h2>
          <p className="mt-1 text-xs font-semibold text-zinc-600">
            Same category · nearest Supreme values
          </p>
        </div>

        <Link
          href="/mm2/values"
          className="text-xs font-black text-red-300 transition hover:text-red-200"
        >
          Browse all →
        </Link>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {weapons.slice(0, 6).map((weapon) => {
          const src = imageUrl(weapon);

          return (
            <Link
              key={weapon.ID ?? weapon.NAME}
              href={`/mm2/values/${encodeURIComponent(weapon.ID ?? weapon.NAME)}`}
              className="group flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3 transition hover:-translate-y-0.5 hover:border-red-400/25 hover:bg-white/[0.04]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.06] bg-black/30 p-1">
                {src ? (
                  <img
                    src={src}
                    alt=""
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-red-300">◆</span>
                )}
              </span>

              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm font-black text-white">
                  {weapon.NAME}
                </strong>
                <span className="mt-1 block text-xs font-bold text-zinc-500">
                  {formatValue(weapon.SOURCE_VALUE)} Supreme · {weapon.DEMAND ?? "N/A"}/10 demand
                </span>
              </span>

              <span className="text-sm text-zinc-700 transition group-hover:text-red-300">
                →
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
