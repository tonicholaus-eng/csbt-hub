"use client";

import { useState } from "react";
import pets from "../data/pets.json";

import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import SearchBar from "../components/SearchBar";
import PopularPets from "../components/PopularPets";
import Stats from "../components/Stats";
import SearchResults from "../components/SearchResults";
import PetDetails from "../components/PetDetails";

import { searchPets } from "../lib/search";
import { Pet } from "../types/pet";

export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);

  const results = searchPets(search);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-100 via-yellow-50 to-orange-100">

      {/* Decorative Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        {/* Clouds */}
        <div className="absolute left-8 top-20 text-8xl opacity-35 animate-pulse">
          ☁️
        </div>

        <div className="absolute right-10 top-56 text-7xl opacity-35 animate-bounce">
          ☁️
        </div>

        <div className="absolute left-1/4 bottom-24 text-7xl opacity-35 animate-pulse">
          ☁️
        </div>

        <div className="absolute right-1/3 bottom-64 text-6xl opacity-35 animate-bounce">
          ☁️
        </div>

        <div className="absolute left-2/3 top-[900px] text-7xl opacity-30 animate-pulse">
          ☁️
        </div>

        {/* Paw Prints */}
        <div className="absolute left-20 top-96 rotate-12 text-5xl opacity-20">
          🐾
        </div>

        <div className="absolute right-40 top-[700px] -rotate-12 text-5xl opacity-20">
          🐾
        </div>

        <div className="absolute left-1/2 bottom-32 text-5xl opacity-20">
          🐾
        </div>

        <div className="absolute right-20 bottom-96 rotate-12 text-5xl opacity-20">
          🐾
        </div>

        {/* Sparkles */}
        <div className="absolute left-1/3 top-40 text-3xl opacity-60 animate-ping">
          ✨
        </div>

        <div className="absolute right-1/4 top-[500px] text-3xl opacity-60 animate-pulse">
          ✨
        </div>

        <div className="absolute left-2/3 bottom-72 text-3xl opacity-60 animate-pulse">
          ⭐
        </div>

        <div className="absolute left-16 top-[700px] text-4xl opacity-50 animate-pulse">
          ⭐
        </div>

        <div className="absolute right-24 top-[1050px] text-3xl opacity-50 animate-ping">
          ✨
        </div>

        <div className="absolute left-1/2 top-[1400px] text-3xl opacity-50 animate-pulse">
          ⭐
        </div>

      </div>

      <div className="relative z-10">

        <Navbar />

        <div className="mx-auto max-w-7xl px-6 pb-16">

          {/* Hero */}
          <div className="relative pt-8">

            <Hero totalPets={pets.length} />

            <SearchBar
              search={search}
              onChange={(value) => {
                setSearch(value);
                setSelectedPet(null);
              }}
            />

          </div>

          {!selectedPet ? (
            <>
              <SearchResults
                pets={results}
                onSelect={(pet) => {
                  setSelectedPet(pet);
                  setSearch(pet.PETS);
                }}
              />

              <PopularPets
                onSelect={(pet) => {
                  setSelectedPet(pet);
                  setSearch(pet.PETS);
                }}
              />
            </>
          ) : (
            <PetDetails
              pet={selectedPet}
              onBack={() => {
                setSelectedPet(null);
                setSearch("");
              }}
            />
          )}

          <Stats totalPets={pets.length} />

        </div>

      </div>

    </main>
  );
} 