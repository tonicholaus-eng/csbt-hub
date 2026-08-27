import MM2Navbar from "../../../../components/mm2/MM2Navbar";
import MM2WeaponDetails from "../../../../components/mm2/MM2WeaponDetails";
import {
  mm2Catalog,
  mm2Demand,
  mm2ImageUrl,
  mm2SupremeValue,
  type MM2CatalogItem,
} from "../../../../lib/mm2/catalog";

function normalize(value: string = "") {
  return decodeURIComponent(value)
    .toLowerCase()
    .trim()
    .replace(/%20/g, " ")
    .replace(/[_-]/g, " ")
    .replace(/[^a-z0-9]+/g, "");
}

function findItem(id: string) {
  const decoded = normalize(id);
  return mm2Catalog.find(
    (item) => normalize(item.NAME) === decoded || normalize(item.ID) === decoded,
  );
}

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
  const isSame = (candidate: MM2CatalogItem) =>
    candidate.ID === item.ID || candidate.NAME === item.NAME;

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
    .filter(
      (candidate) =>
        candidate.ID !== item.ID &&
        candidate.NAME !== item.NAME &&
        candidate.CATEGORY === item.CATEGORY,
    )
    .sort((a, b) => {
      // Unpriced weapons sort last rather than being treated as value 0.
      const av = mm2SupremeValue(a) ?? Number.POSITIVE_INFINITY;
      const bv = mm2SupremeValue(b) ?? Number.POSITIVE_INFINITY;
      return Math.abs(av - currentValue) - Math.abs(bv - currentValue);
    })
    .slice(0, 6);
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = findItem(id);

  if (!item) {
    return (
      <main className="min-h-screen bg-[#07080d] text-white">
        <MM2Navbar />
        <div className="lg:pl-[288px]">
          <div className="mx-auto max-w-[1200px] px-6 py-10">
            <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-8">
              <h1 className="text-2xl font-black">Weapon not found</h1>
              <p className="mt-2 text-sm text-zinc-500">Requested: {id}</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07080d] text-white">
      <MM2Navbar />
      <div className="lg:pl-[288px]">
        <div className="mx-auto max-w-[1260px] px-4 py-8 sm:px-6 lg:px-8">
          <MM2WeaponDetails
            item={item}
            image={mm2ImageUrl(item)}
            relatedWeapons={getRelated(item)}
            demandContext={getDemandContext(item)}
          />
        </div>
      </div>
    </main>
  );
}
