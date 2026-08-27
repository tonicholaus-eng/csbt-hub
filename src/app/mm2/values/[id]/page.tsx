import Link from "next/link";
import { permanentRedirect } from "next/navigation";

import MM2Navbar from "../../../../components/mm2/MM2Navbar";
import MM2WeaponDetails from "../../../../components/mm2/MM2WeaponDetails";
import {
  mm2Catalog,
  mm2Demand,
  mm2ImageUrl,
  mm2ProfileHref,
  mm2SupremeValue,
  resolveMM2Item,
  type MM2CatalogItem,
} from "../../../../lib/mm2/catalog";

function getDemandContext(item: MM2CatalogItem) {
  const demand = mm2Demand(item);
  const categoryItems = mm2Catalog.filter(
    (candidate) => candidate.CATEGORY === item.CATEGORY && mm2Demand(candidate) !== null,
  );
  const globalItems = mm2Catalog.filter((candidate) => mm2Demand(candidate) !== null);

  const sortByDemand = (a: MM2CatalogItem, b: MM2CatalogItem) =>
    (mm2Demand(b) ?? -1) - (mm2Demand(a) ?? -1) ||
    (mm2SupremeValue(b) ?? -1) - (mm2SupremeValue(a) ?? -1) ||
    a.NAME.localeCompare(b.NAME);

  const rankedCategory = [...categoryItems].sort(sortByDemand);
  const rankedGlobal = [...globalItems].sort(sortByDemand);
  // Rank by ID: names are not unique under normalization, IDs always are.
  const isSame = (candidate: MM2CatalogItem) => candidate.ID === item.ID;

  return {
    demand,
    categoryAverage: categoryItems.length
      ? categoryItems.reduce((sum, candidate) => sum + (mm2Demand(candidate) ?? 0), 0) /
        categoryItems.length
      : null,
    categoryRank: demand === null ? null : rankedCategory.findIndex(isSame) + 1,
    categoryRatedCount: categoryItems.length,
    globalRank: demand === null ? null : rankedGlobal.findIndex(isSame) + 1,
    globalRatedCount: globalItems.length,
  };
}

function getRelated(item: MM2CatalogItem) {
  const currentValue = mm2SupremeValue(item) ?? 0;
  return mm2Catalog
    .filter((candidate) => candidate.ID !== item.ID && candidate.CATEGORY === item.CATEGORY)
    .sort((a, b) => {
      // Unpriced weapons sort last rather than being treated as value 0.
      const av = mm2SupremeValue(a) ?? Number.POSITIVE_INFINITY;
      const bv = mm2SupremeValue(b) ?? Number.POSITIVE_INFINITY;
      return Math.abs(av - currentValue) - Math.abs(bv - currentValue);
    })
    .slice(0, 6);
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#07080d] text-white">
      <MM2Navbar />
      <div className="lg:pl-[288px]">
        <div className="mx-auto max-w-[1260px] px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </div>
    </main>
  );
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resolved = resolveMM2Item(id);

  // An older name-based URL still resolves, but send it to the canonical ID URL
  // so every weapon has exactly one address.
  if (resolved.status === "found" && !resolved.canonical) {
    permanentRedirect(mm2ProfileHref(resolved.item));
  }

  // Two or more weapons share this normalized slug. Ask rather than guess -
  // guessing is what made "Rainbow Gun" show Rainbow (Gun)'s value.
  if (resolved.status === "ambiguous") {
    return (
      <Shell>
        <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-8">
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-red-300">
            More than one match
          </p>
          <h1 className="mt-2 text-2xl font-black">Which weapon did you mean?</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {resolved.candidates.length} MM2 weapons share the name &ldquo;{resolved.slug}&rdquo;.
            They have different values, so CSBT will not pick one for you.
          </p>
          <ul className="mt-5 grid gap-2">
            {resolved.candidates.map((candidate) => (
              <li key={candidate.ID}>
                <Link
                  href={mm2ProfileHref(candidate)}
                  className="flex min-h-14 items-center justify-between gap-4 rounded-[16px] border border-white/[0.08] bg-white/[0.02] px-4 py-3 transition hover:border-red-400/30 hover:bg-white/[0.04]"
                >
                  <span className="min-w-0">
                    <strong className="block truncate text-sm font-black text-white">
                      {candidate.NAME}
                    </strong>
                    <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[.1em] text-zinc-500">
                      {candidate.CATEGORY ?? "Weapon"}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-black tabular-nums text-red-200">
                    {mm2SupremeValue(candidate)?.toLocaleString("en-US") ?? "N/A"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Shell>
    );
  }

  if (resolved.status === "missing") {
    return (
      <Shell>
        <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-8">
          <h1 className="text-2xl font-black">Weapon not found</h1>
          <p className="mt-2 text-sm text-zinc-500">Requested: {id}</p>
          <Link
            href="/mm2/values"
            className="mt-5 inline-flex min-h-11 items-center rounded-[14px] border border-white/[0.1] px-4 text-xs font-black text-zinc-300 transition hover:border-red-400/30 hover:text-white"
          >
            Browse all MM2 weapons
          </Link>
        </div>
      </Shell>
    );
  }

  const item = resolved.item;

  return (
    <Shell>
      <MM2WeaponDetails
        item={item}
        image={mm2ImageUrl(item)}
        relatedWeapons={getRelated(item)}
        demandContext={getDemandContext(item)}
      />
    </Shell>
  );
}
