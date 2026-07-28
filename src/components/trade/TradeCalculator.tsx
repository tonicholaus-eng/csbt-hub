"use client";

import { useMemo, useState } from "react";

import AddPetModal from "./AddPetModal";
import TradeSide from "./TradeSide";
import TradeSummary from "./TradeSummary";
import { TradePet } from "./types";

export default function TradeCalculator() {
  const [modalOpen, setModalOpen] = useState(false);

  const [activeSide, setActiveSide] = useState<"your" | "their">("your");

  const [valueType, setValueType] = useState<
    "NORMAL" | "NEON" | "MEGA"
  >("NORMAL");

  const [yourPets, setYourPets] = useState<TradePet[]>([]);

  const [theirPets, setTheirPets] = useState<TradePet[]>([]);

  function getValue(pet: TradePet) {
    return Number(pet[valueType]);
  }

  const yourTotal = useMemo(() => {
    return yourPets.reduce(
      (sum, pet) => sum + getValue(pet),
      0
    );
  }, [yourPets, valueType]);

  const theirTotal = useMemo(() => {
    return theirPets.reduce(
      (sum, pet) => sum + getValue(pet),
      0
    );
  }, [theirPets, valueType]);

  function addPet(pet: TradePet) {
    if (activeSide === "your") {
      setYourPets((prev) => [...prev, pet]);
    } else {
      setTheirPets((prev) => [...prev, pet]);
    }
  }

  function removeYour(index: number) {
    setYourPets((prev) =>
      prev.filter((_, i) => i !== index)
    );
  }

  function removeTheir(index: number) {
    setTheirPets((prev) =>
      prev.filter((_, i) => i !== index)
    );
  }

  return (
    <>      <section className="mt-16 rounded-3xl bg-white p-8 shadow-2xl">

        <div className="text-center">

          <span className="rounded-full bg-yellow-100 px-4 py-2 text-sm font-bold text-yellow-700">
            NEW
          </span>

          <h2 className="mt-4 text-4xl font-black text-gray-800">
            🧮 Trade Calculator
          </h2>

          <p className="mt-2 text-gray-500">
            Compare your trade before accepting.
          </p>

          <div className="mt-6 flex justify-center">

            <select
              value={valueType}
              onChange={(e) =>
                setValueType(
                  e.target.value as
                    | "NORMAL"
                    | "NEON"
                    | "MEGA"
                )
              }
              className="rounded-xl border-2 border-yellow-300 bg-white px-5 py-3 font-bold outline-none"
            >
              <option value="NORMAL">
                Normal Values
              </option>

              <option value="NEON">
                Neon Values
              </option>

              <option value="MEGA">
                Mega Values
              </option>

            </select>

          </div>

        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_auto_1fr]">

          <TradeSide
            title="Your Offer"
            color="yellow"
            pets={yourPets}
            total={yourTotal}
            onAdd={() => {
              setActiveSide("your");
              setModalOpen(true);
            }}
            onRemove={removeYour}
          />

          <div className="flex items-center justify-center">

            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-3xl font-black text-white shadow-xl">
              VS
            </div>

          </div>

          <TradeSide
            title="Their Offer"
            color="cyan"
            pets={theirPets}
            total={theirTotal}
            onAdd={() => {
              setActiveSide("their");
              setModalOpen(true);
            }}
            onRemove={removeTheir}
          />

        </div>

        <TradeSummary
          yourTotal={yourTotal}
          theirTotal={theirTotal}
        />

      </section>      <AddPetModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={addPet}
      />
    </>
  );
}