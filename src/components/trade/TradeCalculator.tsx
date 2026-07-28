"use client";

import { useMemo, useState } from "react";

import AddPetModal from "./AddPetModal";
import TradeSide from "./TradeSide";
import TradeSummary from "./TradeSummary";
import { TradePet } from "./types";

type ValueType = "NORMAL" | "NEON" | "MEGA";

export default function TradeCalculator() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSide, setActiveSide] = useState<"your" | "their">("your");
  const [valueType, setValueType] = useState<ValueType>("NORMAL");

  const [yourPets, setYourPets] = useState<TradePet[]>([]);
  const [theirPets, setTheirPets] = useState<TradePet[]>([]);

  function getValue(pet: TradePet) {
    const raw = String(pet[valueType]).trim();

    if (!raw) return 0;

    if (raw.includes("-")) {
      return Number(raw.split("-")[0].trim());
    }

    return Number(raw);
  }

  const yourTotal = useMemo(
    () => yourPets.reduce((sum, pet) => sum + getValue(pet), 0),
    [yourPets, valueType]
  );

  const theirTotal = useMemo(
    () => theirPets.reduce((sum, pet) => sum + getValue(pet), 0),
    [theirPets, valueType]
  );

  function addPet(pet: TradePet) {
    if (activeSide === "your") {
      setYourPets((prev) => [...prev, pet]);
    } else {
      setTheirPets((prev) => [...prev, pet]);
    }
  }

  function removeYour(index: number) {
    setYourPets((prev) => prev.filter((_, i) => i !== index));
  }

  function removeTheir(index: number) {
    setTheirPets((prev) => prev.filter((_, i) => i !== index));
  }

  function swapSides() {
  const your = [...yourPets];
  const their = [...theirPets];

  setYourPets(their);
  setTheirPets(your);
}

  function clearTrade() {
    setYourPets([]);
    setTheirPets([]);
  }

  return (
    <>
      <section
        id="calculator"
        className="mt-20 overflow-hidden rounded-[40px] border border-white/40 bg-white/80 p-8 shadow-2xl backdrop-blur-xl lg:p-10"
      >
        <div className="text-center">

          <span className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-5 py-2 text-sm font-bold text-yellow-700">
            🧮 Trade Calculator
          </span>

          <h2 className="mt-6 text-5xl font-black text-gray-800">
            Calculate Your Trade
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
            Compare both offers instantly using the latest CSBT values before
            accepting a trade.
          </p>

        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">

          <select
            value={valueType}
            onChange={(e) => setValueType(e.target.value as ValueType)}
            className="rounded-2xl border-2 border-yellow-300 bg-white px-6 py-4 font-bold shadow-sm outline-none transition hover:border-yellow-400 focus:border-yellow-500"
          >
            <option value="NORMAL">🟡 Normal Values</option>
            <option value="NEON">🔷 Neon Values</option>
            <option value="MEGA">🌈 Mega Values</option>
          </select>

          <button
            onClick={swapSides}
            className="rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4 font-bold text-white shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            🔄 Swap Offers
          </button>

          <button
            onClick={clearTrade}
            className="rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 px-6 py-4 font-bold text-white shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            🗑 Clear Trade
          </button>

        </div>

        <div className="my-12 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

        <div className="grid gap-10 xl:grid-cols-[1fr_auto_1fr]">

          <TradeSide
            title="Your Offer"
            color="yellow"
            pets={yourPets}
            total={yourTotal}
            valueType={valueType}
            onAdd={() => {
              setActiveSide("your");
              setModalOpen(true);
            }}
            onRemove={removeYour}
          />

          <div className="flex items-center justify-center">

            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-600 text-4xl font-black text-white shadow-2xl">
              VS
            </div>

          </div>

          <TradeSide
            title="Their Offer"
            color="cyan"
            pets={theirPets}
            total={theirTotal}
            valueType={valueType}
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

      </section>

      <AddPetModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={addPet}
      />
    </>
  );
}