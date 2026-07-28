import { TradePet } from "./types";

type Props = {
  pet: TradePet;
  onRemove: () => void;
};

export default function TradePetCard({
  pet,
  onRemove,
}: Props) {
  return (
    <div className="group relative flex items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">

      <img
        src={pet.IMAGE}
        alt={pet.PETS}
        className="h-16 w-16 rounded-xl object-contain"
        onError={(e) => {
          e.currentTarget.src = "/pets/placeholder.webp";
        }}
      />

      <div className="flex-1">

        <h4 className="font-bold text-gray-800">
          {pet.PETS}
        </h4>

        <p className="text-sm text-gray-500">
          Value: {pet.NORMAL}
        </p>

      </div>

      <button
        onClick={onRemove}
        className="rounded-full bg-red-500 px-3 py-2 text-sm font-bold text-white transition hover:bg-red-600"
      >
        ✕
      </button>

    </div>
  );
}