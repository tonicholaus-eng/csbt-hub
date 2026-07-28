import { TradePet } from "./types";

type Props = {
  pet: TradePet;
  valueType: "NORMAL" | "NEON" | "MEGA";
  onRemove: () => void;
};

export default function TradePetCard({
  pet,
  valueType,
  onRemove,
}: Props) {
  const badgeColors = {
    NORMAL: "bg-yellow-100 text-yellow-700",
    NEON: "bg-cyan-100 text-cyan-700",
    MEGA: "bg-pink-100 text-pink-700",
  };

  return (
    <div className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">

      <img
        src={pet.IMAGE}
        alt={pet.PETS}
        className="h-16 w-16 rounded-xl bg-gray-50 object-contain p-1"
        onError={(e) => {
          e.currentTarget.src = "/pets/placeholder.webp";
        }}
      />

      <div className="flex-1">

        <h4 className="font-bold text-gray-800">
          {pet.PETS}
        </h4>

        <div className="mt-2 flex items-center gap-2">

          <span
            className={`rounded-full px-2 py-1 text-xs font-bold ${badgeColors[valueType]}`}
          >
            {valueType}
          </span>

          <span className="text-sm font-semibold text-gray-600">
            {pet[valueType]}
          </span>

        </div>

      </div>

      <button
        onClick={onRemove}
        className="rounded-xl bg-red-500 px-3 py-2 font-bold text-white transition hover:bg-red-600 hover:scale-105"
      >
        ✕
      </button>

    </div>
  );
}