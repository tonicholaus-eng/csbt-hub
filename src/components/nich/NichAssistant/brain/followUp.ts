import type {
  NichContextPet,
  NichConversationContext,
  PetVariant,
} from "./types";

export type FollowUpResolution = {
  message: string;
  usedContext: true;
  expired: false;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePetName(value: string) {
  return normalizeText(value);
}

function getRecentPets(
  context: NichConversationContext,
) {
  return context.recentPets ?? [];
}

function getLastPet(
  context: NichConversationContext,
): NichContextPet | undefined {
  if (context.lastPetName) {
    return {
      petName: context.lastPetName,
      variant: context.lastVariant,
      value: context.lastNumericValue,
    };
  }

  return getRecentPets(context)[0];
}

function formatContextPet(
  pet: NichContextPet,
) {
  if (pet.variant) {
    return `${pet.variant} ${pet.petName}`;
  }

  return pet.petName;
}

function normalizeVariant(
  value: string,
): PetVariant {
  if (value === "mega" || value === "mfr") {
    return "mega";
  }

  if (value === "neon" || value === "nfr") {
    return "neon";
  }

  return "normal";
}

function getPetByOrdinal(
  ordinal: string,
  context: NichConversationContext,
): NichContextPet | undefined {
  const recentPets = getRecentPets(context);

  switch (ordinal) {
    case "first":
    case "1st":
      return recentPets[0];

    case "second":
    case "2nd":
      return recentPets[1];

    case "third":
    case "3rd":
      return recentPets[2];

    case "fourth":
    case "4th":
      return recentPets[3];

    case "fifth":
    case "5th":
      return recentPets[4];

    case "last":
      return recentPets[
        recentPets.length - 1
      ];

    default:
      return undefined;
  }
}

function resolveOrdinalComparison(
  message: string,
  context: NichConversationContext,
): FollowUpResolution | null {
  const normalizedMessage =
    normalizeText(message);

  const match = normalizedMessage.match(
    /^(?:now\s+)?compare\s+(?:the\s+)?(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|last)(?:\s+(?:one|pet))?\s+(?:and|with|to|vs|versus)\s+(?:the\s+)?(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|last)(?:\s+(?:one|pet))?$/,
  );

  if (!match) {
    return null;
  }

  const firstPet = getPetByOrdinal(
    match[1],
    context,
  );

  const secondPet = getPetByOrdinal(
    match[2],
    context,
  );

  if (!firstPet || !secondPet) {
    return null;
  }

  return {
    message: `${formatContextPet(
      firstPet,
    )} for ${formatContextPet(secondPet)}`,
    usedContext: true,
    expired: false,
  };
}

function resolveHighestLowestComparison(
  message: string,
  context: NichConversationContext,
): FollowUpResolution | null {
  const normalizedMessage =
    normalizeText(message);

  const requestsComparison = [
    "compare highest and lowest",
    "compare the highest and lowest",
    "compare highest with lowest",
    "compare the highest with the lowest",
    "compare most and least valuable",
    "compare the most and least valuable",
  ].includes(normalizedMessage);

  if (!requestsComparison) {
    return null;
  }

  const comparablePets = getRecentPets(
    context,
  ).filter(
    (
      pet,
    ): pet is NichContextPet & {
      value: number;
    } =>
      typeof pet.value === "number" &&
      Number.isFinite(pet.value),
  );

  if (comparablePets.length < 2) {
    return null;
  }

  const sortedPets = [
    ...comparablePets,
  ].sort(
    (firstPet, secondPet) =>
      secondPet.value - firstPet.value,
  );

  const highestPet = sortedPets[0];
  const lowestPet =
    sortedPets[sortedPets.length - 1];

  return {
    message: `${formatContextPet(
      highestPet,
    )} for ${formatContextPet(lowestPet)}`,
    usedContext: true,
    expired: false,
  };
}

function resolveAllPetsVariant(
  message: string,
  context: NichConversationContext,
): FollowUpResolution | null {
  const normalizedMessage =
    normalizeText(message);

  const commandMatch =
    normalizedMessage.match(
      /^(?:now\s+)?(?:make|change|show)(?:\s+me)?\s+(?:them\s+)?(?:both|all)(?:\s+(?:to|as))?\s+(normal|regular|neon|nfr|mega|mfr)(?:\s+(?:versions?|values?|forms?))?$/,
    );

  const possessiveMatch =
    normalizedMessage.match(
      /^(?:what about|how about|and)\s+(?:their|the)\s+(normal|regular|neon|nfr|mega|mfr)(?:\s+(?:versions?|values?|forms?))?$/,
    );

  const trailingGroupMatch =
    normalizedMessage.match(
      /^(?:what about|how about|and)\s+(normal|regular|neon|nfr|mega|mfr)(?:\s+(?:versions?|values?|forms?))?\s+(?:for\s+)?(?:both|all|them)$/,
    );

  const rawVariant =
    commandMatch?.[1] ??
    possessiveMatch?.[1] ??
    trailingGroupMatch?.[1];

  if (!rawVariant) {
    return null;
  }

  const recentPets = getRecentPets(context);

  if (recentPets.length === 0) {
    return null;
  }

  const variant =
    normalizeVariant(rawVariant);

  return {
    message: recentPets
      .map(
        (pet) =>
          `${variant} ${pet.petName}`,
      )
      .join(", "),
    usedContext: true,
    expired: false,
  };
}

function resolveSinglePetVariant(
  message: string,
  context: NichConversationContext,
): FollowUpResolution | null {
  const normalizedMessage =
    normalizeText(message);

  const match = normalizedMessage.match(
    /^(?:same\s+(?:but|in|as)\s+|now\s+|make\s+(?:it\s+)?|change\s+(?:it\s+)?(?:to\s+)?|show\s+(?:it\s+)?(?:as\s+)?)(normal|regular|neon|nfr|mega|mfr)(?:\s+(?:version|value|form))?$/,
  );

  if (!match) {
    return null;
  }

  const lastPet = getLastPet(context);

  if (!lastPet) {
    return null;
  }

  const variant =
    normalizeVariant(match[1]);

  return {
    message: `What is the ${variant} ${lastPet.petName} worth?`,
    usedContext: true,
    expired: false,
  };
}

function resolveOtherPet(
  message: string,
  context: NichConversationContext,
): FollowUpResolution | null {
  const normalizedMessage =
    normalizeText(message);

  const asksForOtherPet = [
    "what about the other one",
    "how about the other one",
    "show the other one",
    "check the other one",
    "what about the other pet",
    "how about the other pet",
  ].includes(normalizedMessage);

  if (!asksForOtherPet) {
    return null;
  }

  const recentPets = getRecentPets(context);

  if (recentPets.length !== 2) {
    return null;
  }

  const normalizedLastPet =
    context.lastPetName
      ? normalizePetName(
          context.lastPetName,
        )
      : undefined;

  const otherPet = normalizedLastPet
    ? recentPets.find(
        (pet) =>
          normalizePetName(pet.petName) !==
          normalizedLastPet,
      )
    : recentPets[1];

  if (!otherPet) {
    return null;
  }

  return {
    message: `What is ${formatContextPet(
      otherPet,
    )} worth?`,
    usedContext: true,
    expired: false,
  };
}

export function resolveAdvancedFollowUp(
  message: string,
  context: NichConversationContext,
): FollowUpResolution | null {
  const resolvers = [
    resolveOrdinalComparison,
    resolveHighestLowestComparison,
    resolveAllPetsVariant,
    resolveSinglePetVariant,
    resolveOtherPet,
  ];

  for (const resolver of resolvers) {
    const result = resolver(
      message,
      context,
    );

    if (result) {
      return result;
    }
  }

  return null;
}

export default resolveAdvancedFollowUp;