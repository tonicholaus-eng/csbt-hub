import Image from "next/image";
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
    NORMAL:
      "border-yellow-300 bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-700",
    NEON:
      "border-cyan-300 bg-gradient-to-r from-cyan-100 to-blue-100 text-cyan-700",
    MEGA:
      "border-pink-300 bg-gradient-to-r from-pink-100 to-purple-100 text-pink-700",
  };

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/60 bg-white/90 p-5 shadow-md backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
      {/* Shine */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

      {/* Top Accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400" />

      {/* Remove */}
      <button
        onClick={onRemove}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white opacity-0 shadow-lg transition-all duration-300 hover:scale-110 hover:bg-red-600 group-hover:opacity-100"
      >
        ✕
      </button>

      <div className="relative flex items-center gap-5">
        {/* Image */}
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-yellow-50 via-white to-orange-100 shadow-inner transition duration-300 group-hover:scale-105">
          <Image
            src={pet.IMAGE}
            alt={pet.PETS}
            width={72}
            height={72}
            className="object-contain transition duration-300 group-hover:scale-110 group-hover:rotate-3"
            unoptimized
          />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-xl font-black text-gray-800">
            {pet.PETS}
          </h4>

          <p className="mt-1 text-sm font-medium text-gray-500">
            Current CSBT Value
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full border px-4 py-1 text-xs font-black uppercase tracking-wide ${badgeColors[valueType]}`}
            >
              {valueType}
            </span>

            <span className="rounded-full bg-gray-100 px-4 py-1 text-lg font-black text-gray-700 shadow-sm">
              {pet[valueType]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}