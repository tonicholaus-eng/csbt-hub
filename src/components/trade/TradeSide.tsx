import TradePetCard from "./TradePetCard";
import { TradePet } from "./types";

type Props = {
  title: string;
  color: "yellow" | "cyan";
  pets: TradePet[];
  total: number;
  valueType: "NORMAL" | "NEON" | "MEGA";
  onAdd: () => void;
  onRemove: (index: number) => void;
};

export default function TradeSide({
  title,
  color,
  pets,
  total,
  valueType,
  onAdd,
  onRemove,
}: Props) {
  const isYellow = color === "yellow";

  return (
    <div
      className={`rounded-3xl border-2 p-6 transition-all ${
        isYellow
          ? "border-yellow-200 bg-gradient-to-b from-yellow-50 to-white"
          : "border-cyan-200 bg-gradient-to-b from-cyan-50 to-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3
          className={`text-2xl font-black ${
            isYellow ? "text-yellow-700" : "text-cyan-700"
          }`}
        >
          {title}
        </h3>

        <span
          className={`rounded-full px-3 py-1 text-sm font-bold ${
            isYellow ? "bg-yellow-200" : "bg-cyan-200"
          }`}
        >
          {pets.length} {pets.length === 1 ? "Pet" : "Pets"}
        </span>
      </div>

      <button
        onClick={onAdd}
        className={`mt-6 w-full rounded-2xl py-3 text-lg font-bold text-white transition hover:scale-[1.02] ${
          isYellow
            ? "bg-yellow-500 hover:bg-yellow-600"
            : "bg-cyan-500 hover:bg-cyan-600"
        }`}
      >
        + Add Pet
      </button>

      <div className="mt-6 space-y-3">
        {pets.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-300 py-12 text-center text-gray-400">
            No pets added yet.
          </div>
        ) : (
          pets.map((pet, index) => (
            <TradePetCard
              key={`${pet.PETS}-${index}`}
              pet={pet}
              valueType={valueType}
              onRemove={() => onRemove(index)}
            />
          ))
        )}
      </div>

      <div
        className={`mt-6 rounded-2xl p-4 text-center ${
          isYellow ? "bg-yellow-100" : "bg-cyan-100"
        }`}
      >
        <p className="text-sm text-gray-500">Total Value</p>

        <p
          className={`text-3xl font-black ${
            isYellow ? "text-yellow-700" : "text-cyan-700"
          }`}
        >
          {total}
        </p>

        <p className="mt-1 text-xs text-gray-500">
          Using {valueType.toLowerCase()} values
        </p>
      </div>
    </div>
  );
}