import { Pet } from "../types/pet";

type Props = {
  pet: Pet;
  onBack: () => void;
};

export default function PetDetails({ pet, onBack }: Props) {
  return (
    <section className="mt-16 rounded-[32px] bg-white p-8 shadow-2xl">

      {/* Back Button */}
      <button
        onClick={onBack}
        className="mb-8 rounded-full bg-yellow-100 px-5 py-2 font-semibold text-yellow-700 transition hover:bg-yellow-200 hover:scale-105"
      >
        ← Back to Search
      </button>

      <div className="grid gap-10 lg:grid-cols-[340px_1fr]">

        {/* Pet Image */}
        <div className="rounded-3xl bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-100 p-8 shadow-inner">

          <img
            src={pet.IMAGE}
            alt={pet.PETS}
            className="mx-auto h-72 w-72 object-contain transition duration-300 hover:scale-110"
            onError={(e) => {
              e.currentTarget.src = "/pets/placeholder.webp";
            }}
          />

        </div>

        {/* Information */}
        <div>

          <div className="flex flex-wrap items-center gap-4">

            <h1 className="text-5xl font-black text-gray-800">
              {pet.PETS}
            </h1>

            <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
              ✔ Updated
            </span>

          </div>

          <p className="mt-3 text-lg text-gray-500">
            Current CSBT Trading Values
          </p>

          {/* Value Cards */}
          <div className="mt-10 grid gap-6 md:grid-cols-3">

            <div className="rounded-3xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100 p-7 text-center shadow-md transition duration-300 hover:-translate-y-2 hover:shadow-xl">
              <div className="text-4xl">🟡</div>

              <p className="mt-3 text-sm font-semibold uppercase tracking-widest text-gray-500">
                Normal
              </p>

              <p className="mt-4 text-5xl font-black text-yellow-700">
                {pet.NORMAL}
              </p>
            </div>

            <div className="rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-100 p-7 text-center shadow-md transition duration-300 hover:-translate-y-2 hover:shadow-xl">
              <div className="text-4xl">🔷</div>

              <p className="mt-3 text-sm font-semibold uppercase tracking-widest text-gray-500">
                Neon
              </p>

              <p className="mt-4 text-5xl font-black text-cyan-700">
                {pet.NEON}
              </p>
            </div>

            <div className="rounded-3xl border border-pink-200 bg-gradient-to-br from-pink-50 to-purple-100 p-7 text-center shadow-md transition duration-300 hover:-translate-y-2 hover:shadow-xl">
              <div className="text-4xl">🌈</div>

              <p className="mt-3 text-sm font-semibold uppercase tracking-widest text-gray-500">
                Mega
              </p>

              <p className="mt-4 text-5xl font-black text-pink-700">
                {pet.MEGA}
              </p>
            </div>

          </div>

          {/* Info Cards */}
          <div className="mt-10 grid gap-5 md:grid-cols-2">

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
              <p className="text-sm font-semibold text-gray-500">
                Database Status
              </p>

              <p className="mt-2 text-lg font-bold text-green-600">
                ✔ Available
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
              <p className="text-sm font-semibold text-gray-500">
                Value Updates
              </p>

              <p className="mt-2 text-lg font-bold text-amber-600">
                Daily
              </p>
            </div>

          </div>

        </div>

      </div>

    </section>
  );
}