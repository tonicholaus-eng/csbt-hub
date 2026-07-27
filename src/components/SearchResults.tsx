import { Pet } from "../types/pet";
type Props = {
  pets: Pet[];
  onSelect: (pet: Pet) => void;
};

export default function SearchResults({
  pets,
  onSelect,
}: Props) {
  if (pets.length === 0) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-xl">

      {pets.map((pet) => (
        <button
          key={pet.PETS}
          onClick={() => onSelect(pet)}
          className="flex w-full items-center gap-4 border-b px-6 py-4 transition hover:bg-yellow-50"
        >
          <img
            src={pet.IMAGE}
            alt={pet.PETS}
            className="h-14 w-14 object-contain"
            onError={(e) => {
              e.currentTarget.src = "/pets/placeholder.webp";
            }}
          />

          <div className="text-left">
            <p className="font-bold text-gray-800">
              {pet.PETS}
            </p>

            <p className="text-sm text-gray-500">
              Normal: {pet.NORMAL}
            </p>
          </div>

        </button>
      ))}

    </div>
  );
}