"use client";

import { useState } from "react";

import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import PetDetails from "../../components/PetDetails";
import SearchBar from "../../components/SearchBar";
import SearchResults from "../../components/SearchResults";

import { searchPets } from "../../lib/search";
import { Pet } from "../../types/pet";

export default function ValuesPage() {
  const [search, setSearch] = useState("");
  const [selectedPet, setSelectedPet] =
    useState<Pet | null>(null);

  const searching = search.trim().length > 0;

  const results = searching
    ? searchPets(search)
    : [];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#fff8e9] text-slate-800 transition-colors duration-300 dark:bg-[#07111f] dark:text-slate-100">
      {/* Background */}

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#e5f7ff_0%,#fff9e8_40%,#fff3dc_70%,#eef9ff_100%)] transition-opacity duration-300 dark:opacity-0" />

      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 dark:opacity-100 dark:bg-[linear-gradient(180deg,#07111f_0%,#0b1729_25%,#111c2f_65%,#0b1626_100%)]" />

      <div className="pointer-events-none absolute -left-40 top-20 h-[520px] w-[520px] rounded-full bg-cyan-200/20 blur-[90px] dark:bg-cyan-500/10" />

      <div className="pointer-events-none absolute -right-44 top-[500px] h-[520px] w-[520px] rounded-full bg-orange-200/20 blur-[90px] dark:bg-amber-500/10" />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,.65)_1px,transparent_1px)] bg-[size:32px_32px] opacity-20 dark:opacity-[0.04]" />

      <div className="relative z-10">
        <Navbar />

        <div className="mx-auto max-w-7xl px-3 pb-24 pt-8 sm:px-6 sm:pb-32 sm:pt-12">
          {/* Header */}

          <header className="mx-auto max-w-3xl text-center">
            <span className="inline-flex rounded-full border border-cyan-200/70 bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-700 backdrop-blur-xl dark:border-cyan-400/15 dark:bg-white/5 dark:text-cyan-300">
              Pet Database
            </span>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Browse Pet Values
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
              Search every Adopt Me pet and instantly
              compare Normal, Neon and Mega values.
            </p>
          </header>

          {/* Search */}

          <section className="mt-10 sm:mt-14">
            <SearchBar
              search={search}
              onChange={(value) => {
                setSearch(value);
                setSelectedPet(null);
              }}
            />
          </section>

          {/* Results */}

          {(searching || selectedPet) && (
            <section className="mt-10">
              {selectedPet ? (
                <PetDetails
                  pet={selectedPet}
                  onBack={() => {
                    setSelectedPet(null);
                    setSearch("");
                  }}
                />
              ) : (
                <SearchResults
                  pets={results}
                  onSelect={(pet) => {
                    setSelectedPet(pet);
                    setSearch(pet.PETS);
                  }}
                />
              )}
            </section>
          )}
        </div>

        <Footer />
      </div>
    </main>
  );
}