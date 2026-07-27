import { Pet } from "../types/pet";
import { getPet } from "../lib/search";

const popularPets = [
  "Frost Dragon",
  "Shadow Dragon",
  "Owl",
  "Crow",
  "Parrot",
  "Giraffe",
  "Balloon Unicorn",
  "Evil Unicorn",
];

type Props = {
  onSelect: (pet: Pet) => void;
};

export default function PopularPets({ onSelect }: Props) {
  return (
    <section className="mt-20">
      <div className="mb-10 text-center">
        <span className="rounded-full bg-yellow-100 px-4 py-2 text-sm font-bold text-yellow-700">
          ⭐ Most Searched
        </span>

        <h2 className="mt-4 text-5xl font-black text-gray-800">
          Popular Pets
        </h2>

        <p className="mt-3 text-gray-500">
          Quickly access the most searched Adopt Me pets.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {popularPets.map((name) => {
          const pet = getPet(name);

          if (!pet) return null;

          return (
            <button
              key={name}
              onClick={() => onSelect(pet)}
              className="
                group
                overflow-hidden
                rounded-3xl
                bg-white
                p-6
                shadow-xl
                transition-all
                duration-300
                hover:-translate-y-2
                hover:shadow-2xl
                hover:ring-2
                hover:ring-yellow-300
              "
            >
              <div className="rounded-2xl bg-gradient-to-br from-yellow-50 to-orange-100 p-5">
                <img
                  src={pet.IMAGE}
                  alt={pet.PETS}
                  className="
                    mx-auto
                    h-28
                    w-28
                    object-contain
                    transition-transform
                    duration-300
                    group-hover:scale-110
                  "
                  onError={(e) => {
                    e.currentTarget.src = "/pets/placeholder.webp";
                  }}
                />
              </div>

              <h3 className="mt-5 text-lg font-black text-gray-800 transition group-hover:text-yellow-600">
                {pet.PETS}
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Click to view values
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}