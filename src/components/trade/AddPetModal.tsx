"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import pets from "../../data/pets.json";
import { TradePet } from "./types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (pet: TradePet) => void;
};

export default function AddPetModal({
  open,
  onClose,
  onSelect,
}: Props) {
  const [search, setSearch] = useState("");

  const filteredPets = useMemo(() => {
    return pets.filter((pet) =>
      pet.PETS.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[88vh] w-full max-w-6xl animate-fade-up flex-col overflow-hidden rounded-[36px] border border-white/30 bg-white/90 shadow-[0_30px_80px_rgba(0,0,0,.35)] backdrop-blur-xl"
      >
        {/* Header */}

        <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-4xl font-black text-gray-800">
                Select a Pet
              </h2>

              <p className="mt-1 text-gray-500">
                {filteredPets.length} pets available
              </p>
            </div>

            <button
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500 font-black text-white transition hover:scale-110 hover:bg-red-600"
            >
              ✕
            </button>
          </div>

          {/* Search */}

          <div className="relative mt-6">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl">
              🔍
            </span>

            <input
              type="text"
              placeholder="Search any Adopt Me pet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border-2 border-yellow-200 bg-white py-4 pl-14 pr-4 text-lg font-semibold outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200"
            />
          </div>
        </div>

        {/* Grid */}

        {filteredPets.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center">
            <div className="text-8xl">🔍</div>

            <h3 className="mt-6 text-3xl font-black text-gray-700">
              No Pets Found
            </h3>

            <p className="mt-3 text-gray-500">
              Try searching with another name.
            </p>
          </div>
        ) : (
          <div className="grid flex-1 grid-cols-2 gap-5 overflow-y-auto p-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredPets.map((pet) => (
              <button
                key={pet.PETS}
                onClick={() => {
                  onSelect(pet as TradePet);
                  setSearch("");
                  onClose();
                }}
                className="group relative overflow-hidden rounded-3xl border border-white/50 bg-white p-4 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:border-yellow-300 hover:shadow-2xl"
              >
                {/* Shine */}

                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                {/* Image */}

                <div className="relative flex h-32 items-center justify-center rounded-3xl bg-gradient-to-br from-yellow-50 via-white to-orange-100">
                  <Image
                    src={pet.IMAGE}
                    alt={pet.PETS}
                    width={90}
                    height={90}
                    className="object-contain transition duration-300 group-hover:scale-110 group-hover:rotate-3"
                    unoptimized
                  />
                </div>

                {/* Name */}

                <h3 className="mt-5 line-clamp-2 min-h-[56px] text-lg font-black text-gray-800">
                  {pet.PETS}
                </h3>

                {/* Values */}

                <div className="mt-4 space-y-2 text-xs font-bold">
                  <div className="flex justify-between rounded-xl bg-yellow-100 px-3 py-2 text-yellow-700">
                    <span>Normal</span>
                    <span>{pet.NORMAL}</span>
                  </div>

                  <div className="flex justify-between rounded-xl bg-cyan-100 px-3 py-2 text-cyan-700">
                    <span>Neon</span>
                    <span>{pet.NEON}</span>
                  </div>

                  <div className="flex justify-between rounded-xl bg-pink-100 px-3 py-2 text-pink-700">
                    <span>Mega</span>
                    <span>{pet.MEGA}</span>
                  </div>
                </div>

                {/* Button */}

                <div className="mt-5 rounded-2xl bg-gradient-to-r from-yellow-500 via-orange-500 to-amber-500 py-3 text-base font-black text-white transition-all duration-300 group-hover:scale-105">
                  + Add Pet
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}