import type {
  NichContextPet,
  NichConversationContext,
  NichResponse,
} from "../brain/types";

const MAX_RECENT_PETS = 8;
const MAX_TURN_COUNT = 10_000;

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

/**
 * Keep the newest mention of each item.
 *
 * The variant is stored on that newest mention, so a follow-up such as
 * "same but mega" uses the user's latest version instead of keeping several
 * stale copies of the same item in recentPets.
 */
function mergeRecentPets(
  currentPets: NichContextPet[] = [],
  incomingPets?: NichContextPet[],
) {
  if (!incomingPets?.length) {
    return currentPets.slice(0, MAX_RECENT_PETS);
  }

  const mergedPets = [
    ...incomingPets,
    ...currentPets,
  ];

  const seen = new Set<string>();

  return mergedPets
    .filter((pet) => {
      const key = normalizePetKey(pet.petName);

      if (!key || seen.has(key)) {
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
    turnCount: Math.min(
      MAX_TURN_COUNT,
      (currentContext.turnCount ?? 0) + 1,
    ),
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