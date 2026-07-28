"use client";

import { useMemo, useState } from "react";
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="border-b p-6">
          <h2 className="text-3xl font-black text-gray-800">
            Add Pet
          </h2>

          <input
            type="text"
            placeholder="Search any Adopt Me pet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-5 w-full rounded-2xl border-2 border-yellow-200 p-4 outline-none transition focus:border-yellow-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredPets.map((pet) => (
            <button
              key={pet.PETS}
              onClick={() => {
                onSelect({
                  PETS: pet.PETS,
                  IMAGE: pet.IMAGE,
                  NORMAL: Number(pet.NORMAL),
                  NEON: Number(pet.NEON),
                  MEGA: Number(pet.MEGA),
                });

                setSearch("");
                onClose();
              }}
              className="flex w-full items-center gap-4 border-b p-4 transition hover:bg-yellow-50"
            >
              <img
                src={pet.IMAGE}
                alt={pet.PETS}
                className="h-16 w-16 object-contain"
                onError={(e) => {
                  e.currentTarget.src = "/pets/placeholder.webp";
                }}
              />

              <div className="flex-1 text-left">
                <h3 className="font-bold text-gray-800">
                  {pet.PETS}
                </h3>

                <p className="text-sm text-gray-500">
                  Normal: {pet.NORMAL}
                </p>
              </div>

              <div className="rounded-xl bg-yellow-500 px-4 py-2 font-bold text-white">
                Add
              </div>
            </button>
          ))}
        </div>

        <div className="border-t p-5">
          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-red-500 py-3 font-bold text-white transition hover:bg-red-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}