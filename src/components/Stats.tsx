type Props = {
  totalPets: number;
};

export default function Stats({
  totalPets,
}: Props) {
  return (
    <section className="mt-12 grid gap-6 md:grid-cols-3">

      <div className="rounded-3xl bg-white p-8 shadow-lg">
        <p className="text-5xl font-black text-yellow-500">
          {totalPets}
        </p>

        <p className="mt-2 text-gray-500">
          Pets Available
        </p>
      </div>

      <div className="rounded-3xl bg-white p-8 shadow-lg">
        <p className="text-5xl">
          ⚡
        </p>

        <p className="mt-2 text-gray-500">
          Instant Search
        </p>
      </div>

      <div className="rounded-3xl bg-white p-8 shadow-lg">
        <p className="text-5xl">
          📈
        </p>

        <p className="mt-2 text-gray-500">
          Latest CSBT Prices
        </p>
      </div>

    </section>
  );
}