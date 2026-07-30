import pets from "../data/pets.json";
import { Pet } from "../types/pet";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

const petList = Array.from(
  new Map(
    (pets as Pet[]).map((pet) => [
      normalize(pet.PETS),
      pet,
    ]),
  ).values(),
);

function getLevenshteinDistance(first: string, second: string): number {
  const rows = second.length + 1;
  const columns = first.length + 1;

  const matrix = Array.from({ length: rows }, () =>
    Array<number>(columns).fill(0),
  );

  for (let column = 0; column < columns; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 0; row < rows; row += 1) {
    matrix[row][0] = row;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const substitutionCost =
        second[row - 1] === first[column - 1] ? 0 : 1;

      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + substitutionCost,
      );
    }
  }

  return matrix[rows - 1][columns - 1];
}

function getSimilarity(first: string, second: string): number {
  if (!first.length && !second.length) return 1;

  const longestLength = Math.max(first.length, second.length);

  if (!longestLength) return 1;

  const distance = getLevenshteinDistance(first, second);

  return 1 - distance / longestLength;
}

function getSearchScore(petName: string, query: string): number {
  const normalizedName = normalize(petName);
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) return 0;

  if (normalizedName === normalizedQuery) {
    return 1000;
  }

  if (normalizedName.startsWith(normalizedQuery)) {
    return 900 - (normalizedName.length - normalizedQuery.length);
  }

  const words = normalizedName.split(" ");

  const matchingWordIndex = words.findIndex((word) =>
    word.startsWith(normalizedQuery),
  );

  if (matchingWordIndex !== -1) {
    return 800 - matchingWordIndex * 10;
  }

  const includedIndex = normalizedName.indexOf(normalizedQuery);

  if (includedIndex !== -1) {
    return 700 - includedIndex;
  }

  const wordSimilarity = Math.max(
    ...words.map((word) => getSimilarity(word, normalizedQuery)),
  );

  const fullNameSimilarity = getSimilarity(normalizedName, normalizedQuery);

  const bestSimilarity = Math.max(wordSimilarity, fullNameSimilarity);

  if (bestSimilarity >= 0.72) {
    return Math.round(bestSimilarity * 600);
  }

  return 0;
}

export function searchPets(query: string): Pet[] {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) return [];

  return petList
    .map((pet) => ({
      pet,
      score: getSearchScore(pet.PETS, normalizedQuery),
    }))
    .filter((result) => result.score > 0)
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return first.pet.PETS.localeCompare(second.pet.PETS);
    })
    .slice(0, 8)
    .map((result) => result.pet);
}

export function getPet(name: string): Pet | undefined {
  const normalizedName = normalize(name);

  return petList.find(
    (pet) => normalize(pet.PETS) === normalizedName,
  );
}

export { petList };