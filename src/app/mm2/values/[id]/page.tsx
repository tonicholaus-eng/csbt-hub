import mm2Items from "../../../../data/mm2Items.json";
import MM2Navbar from "../../../../components/mm2/MM2Navbar";
import MM2WeaponDetails from "../../../../components/mm2/MM2WeaponDetails";

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
  return (mm2Items as any[]).find((item: any) => normalize(item.NAME) === decoded || normalize(item.ID) === decoded);
}

function imageUrl(item: any) {
  if (!item?.IMAGE) return null;
  if (/^https?:\/\//i.test(item.IMAGE)) return item.IMAGE;
  if (item.IMAGE.startsWith("/")) return `https://supremevalues.com${item.IMAGE}`;
  return `https://supremevalues.com/${item.IMAGE.replace(/^\.\.\//, "")}`;
}


function getDemandContext(item: any) {
  const demand = typeof item.DEMAND === "number" && Number.isFinite(item.DEMAND) ? item.DEMAND : null;
  const categoryItems = (mm2Items as any[]).filter(
    (candidate: any) =>
      candidate.CATEGORY === item.CATEGORY &&
      typeof candidate.DEMAND === "number" &&
      Number.isFinite(candidate.DEMAND),
  );
  const globalItems = (mm2Items as any[]).filter(
    (candidate: any) =>
      typeof candidate.DEMAND === "number" && Number.isFinite(candidate.DEMAND),
  );

  const sortByDemand = (a: any, b: any) =>
    (b.DEMAND ?? -1) - (a.DEMAND ?? -1) ||
    (b.SOURCE_VALUE ?? -1) - (a.SOURCE_VALUE ?? -1) ||
    String(a.NAME).localeCompare(String(b.NAME));

  const rankedCategory = [...categoryItems].sort(sortByDemand);
  const rankedGlobal = [...globalItems].sort(sortByDemand);

  return {
    demand,
    categoryAverage: categoryItems.length
      ? categoryItems.reduce((sum: number, candidate: any) => sum + candidate.DEMAND, 0) / categoryItems.length
      : null,
    categoryRank: demand === null
      ? null
      : rankedCategory.findIndex((candidate: any) => candidate.ID === item.ID || candidate.NAME === item.NAME) + 1,
    categoryRatedCount: categoryItems.length,
    globalRank: demand === null
      ? null
      : rankedGlobal.findIndex((candidate: any) => candidate.ID === item.ID || candidate.NAME === item.NAME) + 1,
    globalRatedCount: globalItems.length,
  };
}

function getRelated(item: any) {
  const currentValue = typeof item.SOURCE_VALUE === "number" ? item.SOURCE_VALUE : 0;
  return (mm2Items as any[])
    .filter((candidate: any) => candidate.ID !== item.ID && candidate.NAME !== item.NAME && candidate.CATEGORY === item.CATEGORY)
    .sort((a: any, b: any) => {
      const av = typeof a.SOURCE_VALUE === "number" ? a.SOURCE_VALUE : Number.POSITIVE_INFINITY;
      const bv = typeof b.SOURCE_VALUE === "number" ? b.SOURCE_VALUE : Number.POSITIVE_INFINITY;
      return Math.abs(av - currentValue) - Math.abs(bv - currentValue);
    })
    .slice(0, 6);
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item: any = findItem(id);

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
            image={imageUrl(item)}
            relatedWeapons={getRelated(item)}
            demandContext={getDemandContext(item)}
          />
        </div>
      </div>
    </main>
  );
}
