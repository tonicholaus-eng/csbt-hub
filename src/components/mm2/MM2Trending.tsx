import MM2WeaponCard from "./MM2WeaponCard";

type Item = {
  NAME: string;
  CATEGORY?: string;
  SUPREME_VALUE?: number;
  DEMAND?: number;
  RARITY?: number;
  STABILITY?: string;
};

export default function MM2Trending({ items }: { items: Item[] }) {
  return (
    <section id="mm2-featured-weapons" className="mt-14" aria-labelledby="mm2-featured-title">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-red-200/70">Weapon showcase</p>
          <h2 id="mm2-featured-title" className="mt-2 text-3xl font-black tracking-[-0.03em] text-white">Featured weapons worth knowing</h2>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-slate-400">These are pulled from your live MM2 dataset to make the homepage feel like a trading floor, not just a dashboard.</p>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {items.map((item) => (
          <MM2WeaponCard key={item.NAME} item={item} />
        ))}
      </div>
    </section>
  );
}
