"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import pets from "../../data/pets.json";
import { TradePet } from "./types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (pet: TradePet) => void;
};

type PetImageProps = {
  src: string;
  name: string;
};

function PetImage({ src, name }: PetImageProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  if (!src || imageFailed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center px-2 text-center">
        <span className="text-4xl sm:text-5xl">🐾</span>

        <span className="mt-2 text-[10px] font-bold text-gray-400 sm:text-xs">
          Image coming soon
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={name}
      width={96}
      height={96}
      className="h-20 w-20 object-contain transition duration-300 group-hover:scale-110 group-hover:rotate-3 sm:h-24 sm:w-24"
      unoptimized
      onError={() => setImageFailed(true)}
    />
  );
}

export default function AddPetModal({
  open,
  onClose,
  onSelect,
}: Props) {
  const [search, setSearch] = useState("");

  const filteredPets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return pets;
    }

    return pets.filter((pet) =>
      pet.PETS.toLowerCase().includes(normalizedSearch),
    );
  }, [search]);

  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/60 p-2 backdrop-blur-sm sm:p-4 sm:backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Select a pet"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-[24px] border border-white/30 bg-white/95 shadow-[0_30px_80px_rgba(0,0,0,.35)] sm:h-[88vh] sm:rounded-[36px]"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-gray-200 bg-white/95 p-4 backdrop-blur-xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl font-black leading-tight text-gray-800 sm:text-4xl">
                Select a Pet
              </h2>

              <p className="mt-1 text-sm text-gray-500 sm:text-base">
                {filteredPets.length} pets available
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close pet selector"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500 text-lg font-black text-white transition hover:scale-105 hover:bg-red-600 sm:h-11 sm:w-11 sm:rounded-2xl"
            >
              ✕
            </button>
          </div>

          {/* Search */}
          <div className="relative mt-4 sm:mt-6">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl sm:left-5 sm:text-2xl">
              🔍
            </span>

            <input
              type="search"
              placeholder="Search any Adopt Me pet..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              autoFocus
              className="w-full rounded-2xl border-2 border-yellow-200 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60 sm:py-4 sm:pl-14 sm:text-lg"
            />
          </div>
        </div>

        {/* Results */}
        {filteredPets.length === 0 ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-10 text-center">
            <div className="text-6xl sm:text-8xl">🔍</div>

            <h3 className="mt-5 text-2xl font-black text-gray-700 sm:mt-6 sm:text-3xl">
              No Pets Found
            </h3>

            <p className="mt-2 text-sm text-gray-500 sm:mt-3 sm:text-base">
              Try searching with another name.
            </p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="grid grid-cols-2 items-start gap-3 p-3 sm:gap-5 sm:p-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredPets.map((pet) => (
                <button
                  type="button"
                  key={pet.PETS}
                  onClick={() => {
                    onSelect(pet as TradePet);
                    setSearch("");
                    onClose();
                  }}
                  className="group relative flex min-h-[360px] min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 text-left shadow-md transition duration-200 hover:-translate-y-1 hover:border-yellow-300 hover:shadow-xl sm:min-h-[420px] sm:rounded-3xl sm:p-4"
                >
                  {/* Shine */}
                  <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                  {/* Image */}
                  <div className="relative flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-50 via-white to-orange-100 sm:h-32 sm:rounded-3xl">
                    <PetImage src={pet.IMAGE} name={pet.PETS} />
                  </div>

                  {/* Name */}
                  <h3 className="relative z-10 mt-3 line-clamp-2 min-h-[44px] w-full break-words text-center text-sm font-black leading-snug text-gray-900 sm:mt-5 sm:min-h-[56px] sm:text-lg">
                    {pet.PETS}
                  </h3>

                  {/* Values */}
                  <div className="relative z-10 mt-3 w-full space-y-2 text-[10px] font-bold sm:mt-4 sm:text-xs">
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-yellow-100 px-2 py-2 text-yellow-800 sm:rounded-xl sm:px-3">
                      <span>Normal</span>

                      <span className="truncate text-right">
                        {pet.NORMAL ?? "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 rounded-lg bg-cyan-100 px-2 py-2 text-cyan-800 sm:rounded-xl sm:px-3">
                      <span>Neon</span>

                      <span className="truncate text-right">
                        {pet.NEON ?? "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 rounded-lg bg-pink-100 px-2 py-2 text-pink-800 sm:rounded-xl sm:px-3">
                      <span>Mega</span>

                      <span className="truncate text-right">
                        {pet.MEGA ?? "—"}
                      </span>
                    </div>
                  </div>

                  {/* Add button */}
                  <div className="relative z-10 mt-auto w-full pt-4">
                    <div className="rounded-xl bg-gradient-to-r from-yellow-500 via-orange-500 to-amber-500 px-2 py-2.5 text-center text-xs font-black text-white transition-transform group-hover:scale-[1.02] sm:rounded-2xl sm:py-3 sm:text-base">
                      + Add Pet
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}