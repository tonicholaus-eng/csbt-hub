import type {
  NichContextPet,
  NichConversationContext,
  NichResponse,
} from "../brain/types";

const MAX_RECENT_PETS = 8;

export const initialNichContext: NichConversationContext = {
  recentPets: [],
  turnCount: 0,
};

function normalizePetKey(petName: string) {
  return petName
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeRecentPets(
  currentPets: NichContextPet[] = [],
  incomingPets?: NichContextPet[],
) {
  if (!incomingPets) {
    return currentPets;
  }

  const mergedPets = [
    ...incomingPets,
    ...currentPets,
  ];

  const seen = new Set<string>();

  return mergedPets
    .filter((pet) => {
      const key = [
        normalizePetKey(pet.petName),
        pet.variant ?? "unspecified",
      ].join(":");

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, MAX_RECENT_PETS);
}

export function updateNichContext(
  currentContext: NichConversationContext,
  response: NichResponse,
): NichConversationContext {
  const responseContext =
    response.context ?? {};

  const recentPets = mergeRecentPets(
    currentContext.recentPets,
    responseContext.recentPets,
  );

  return {
    ...currentContext,
    ...responseContext,
    recentPets,
    lastIntent:
      responseContext.lastIntent ??
      response.intent,
    turnCount:
      (currentContext.turnCount ?? 0) + 1,
    lastUpdatedAt: Date.now(),
  };
}

export function resetNichContext(): NichConversationContext {
  return {
    ...initialNichContext,
    recentPets: [],
  };
}

export default updateNichContext;