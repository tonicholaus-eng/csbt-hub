import pets from "../data/pets.json";
import { Pet } from "../types/pet";

const petList = pets as Pet[];

export function searchPets(query: string): Pet[] {
  if (!query.trim()) return [];

  return petList
    .filter((pet) =>
      pet.PETS.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 8);
}

export function getPet(name: string): Pet | undefined {
  return petList.find((pet) => pet.PETS === name);
}

export { petList };