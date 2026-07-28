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
      className={`group relative flex h-full flex-col overflow-hidden rounded-[34px] border bg-white/75 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_25px_60px_rgba(0,0,0,.15)] ${
        isYellow
          ? "border-yellow-200/70"
          : "border-cyan-200/70"
      }`}
    >
      {/* Decorative Glow */}
      <div
        className={`absolute inset-x-0 top-0 h-2 ${
          isYellow
            ? "bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500"
            : "bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500"
        }`}
      />

      {/* Header */}
      <div
        className={`px-7 py-7 ${
          isYellow
            ? "bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500"
            : "bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-3xl font-black text-white">
              {title}
            </h3>

            <p className="mt-1 text-sm text-white/80">
              Build your trade offer
            </p>
          </div>

          <span className="rounded-full bg-white/20 px-4 py-2 text-sm font-bold text-white backdrop-blur-md">
            {pets.length} {pets.length === 1 ? "Pet" : "Pets"}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        {/* Add Button */}
        <button
          onClick={onAdd}
          className={`group rounded-2xl py-4 text-lg font-black text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-2xl active:scale-95 ${
            isYellow
              ? "bg-gradient-to-r from-yellow-500 via-orange-500 to-amber-500"
              : "bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600"
          }`}
        >
          <span className="transition group-hover:tracking-wide">
            + Add Pet
          </span>
        </button>

        {/* Pet List */}
        <div className="mt-6 flex-1 overflow-hidden rounded-3xl border border-white/60 bg-white/70 shadow-inner">
          <div className="h-[430px] overflow-y-auto p-4">
            {pets.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 px-6 text-center">
                <div className="animate-bounce text-7xl">
                  🐾
                </div>

                <h4 className="mt-5 text-2xl font-black text-gray-700">
                  No Pets Added
                </h4>

                <p className="mt-3 max-w-xs text-sm leading-6 text-gray-500">
                  Press the{" "}
                  <span className="font-bold">
                    Add Pet
                  </span>{" "}
                  button to start building your trade.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pets.map((pet, index) => (
                  <TradePetCard
                    key={`${pet.PETS}-${index}`}
                    pet={pet}
                    valueType={valueType}
                    onRemove={() => onRemove(index)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Total */}
        <div
          className={`relative mt-6 overflow-hidden rounded-3xl p-6 text-center shadow-inner ${
            isYellow
              ? "bg-gradient-to-br from-yellow-100 via-yellow-50 to-orange-100"
              : "bg-gradient-to-br from-cyan-100 via-cyan-50 to-blue-100"
          }`}
        >
          <div className="absolute inset-0 opacity-30 blur-3xl">
            <div
              className={`mx-auto h-32 w-32 rounded-full ${
                isYellow
                  ? "bg-yellow-400"
                  : "bg-cyan-400"
              }`}
            />
          </div>

          <div className="relative">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-gray-500">
              Total Value
            </p>

            <p
              className={`mt-4 text-6xl font-black tabular-nums transition-all duration-300 ${
                isYellow
                  ? "text-yellow-700"
                  : "text-cyan-700"
              }`}
            >
              {total}
            </p>

            <p className="mt-3 text-sm font-semibold text-gray-500">
              {valueType.charAt(0)}
              {valueType.slice(1).toLowerCase()} Values
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}