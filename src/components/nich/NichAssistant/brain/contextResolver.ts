import type {
  NichBrainInput,
  NichContextPet,
  NichConversationContext,
} from "./types";

const CONTEXT_EXPIRY_MS =
  30 * 60 * 1000;

export type ContextResolution = {
  message: string;
  usedContext: boolean;
  expired: boolean;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isContextExpired(
  context: NichConversationContext,
) {
  if (!context.lastUpdatedAt) {
    return false;
  }

  return (
    Date.now() - context.lastUpdatedAt >
    CONTEXT_EXPIRY_MS
  );
}

function getRecentPets(
  context: NichConversationContext,
) {
  return context.recentPets ?? [];
}

function formatContextPet(
  pet: NichContextPet,
) {
  if (pet.variant) {
    return `${pet.variant} ${pet.petName}`;
  }

  return pet.petName;
}

function getLastPet(
  context: NichConversationContext,
): NichContextPet | undefined {
  const recentPets =
    getRecentPets(context);

  if (recentPets.length > 0) {
    return recentPets[0];
  }

  if (!context.lastPetName) {
    return undefined;
  }

  return {
    petName: context.lastPetName,
    variant: context.lastVariant,
  };
}

function getPetByOrdinal(
  ordinal: string,
  context: NichConversationContext,
) {
  const recentPets =
    getRecentPets(context);

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

    case "last":
      return recentPets[
        recentPets.length - 1
      ];

    default:
      return undefined;
  }
}

function resolveOrdinalReferences(
  message: string,
  context: NichConversationContext,
) {
  let resolvedMessage = message;
  let usedContext = false;

  const ordinalExpression =
    /\b(first|1st|second|2nd|third|3rd|fourth|4th|last)\s+(?:one|pet)\b/gi;

  resolvedMessage =
    resolvedMessage.replace(
      ordinalExpression,
      (match, ordinal: string) => {
        const pet = getPetByOrdinal(
          ordinal.toLowerCase(),
          context,
        );

        if (!pet) {
          return match;
        }

        usedContext = true;
        return formatContextPet(pet);
      },
    );

  return {
    message: resolvedMessage,
    usedContext,
  };
}

function resolveCompareFirstTwo(
  message: string,
  context: NichConversationContext,
): ContextResolution | null {
  const normalizedMessage =
    normalizeText(message);

  const requestsFirstTwo =
    normalizedMessage ===
      "compare the first two" ||
    normalizedMessage ===
      "compare first two" ||
    normalizedMessage ===
      "compare the first 2" ||
    normalizedMessage ===
      "compare first 2";

  if (!requestsFirstTwo) {
    return null;
  }

  const recentPets =
    getRecentPets(context);

  if (recentPets.length < 2) {
    return null;
  }

  return {
    message: `${formatContextPet(
      recentPets[0],
    )} for ${formatContextPet(
      recentPets[1],
    )}`,
    usedContext: true,
    expired: false,
  };
}

function resolveCompareThose(
  message: string,
  context: NichConversationContext,
): ContextResolution | null {
  const normalizedMessage =
    normalizeText(message);

  const requestsComparison =
    normalizedMessage === "compare those" ||
    normalizedMessage ===
      "compare them" ||
    normalizedMessage ===
      "compare both" ||
    normalizedMessage ===
      "compare the two" ||
    normalizedMessage ===
      "which one is worth more";

  if (!requestsComparison) {
    return null;
  }

  const recentPets =
    getRecentPets(context);

  if (recentPets.length < 2) {
    return null;
  }

  return {
    message: `${formatContextPet(
      recentPets[0],
    )} for ${formatContextPet(
      recentPets[1],
    )}`,
    usedContext: true,
    expired: false,
  };
}

function resolveVariantFollowUp(
  message: string,
  context: NichConversationContext,
): ContextResolution | null {
  const normalizedMessage =
    normalizeText(message);

  const variantMatch =
    normalizedMessage.match(
      /^(?:what about|how about|and|show me|what is|whats)?\s*(normal|regular|neon|nfr|mega|mfr)(?:\s+value|\s+worth|\s+one)?$/,
    );

  if (!variantMatch) {
    return null;
  }

  const lastPet = getLastPet(context);

  if (!lastPet) {
    return null;
  }

  const rawVariant = variantMatch[1];

  const variant =
    rawVariant === "mega" ||
    rawVariant === "mfr"
      ? "mega"
      : rawVariant === "neon" ||
          rawVariant === "nfr"
        ? "neon"
        : "normal";

  return {
    message: `What is the ${variant} ${lastPet.petName} worth?`,
    usedContext: true,
    expired: false,
  };
}

function resolveMakeAllVariant(
  message: string,
  context: NichConversationContext,
): ContextResolution | null {
  const normalizedMessage =
    normalizeText(message);

  const match = normalizedMessage.match(
    /^(?:make|show|change)\s+(?:them\s+)?all\s+(normal|neon|mega)$/,
  );

  if (!match) {
    return null;
  }

  const recentPets =
    getRecentPets(context);

  if (recentPets.length === 0) {
    return null;
  }

  const variant = match[1];

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

function resolveNearbyValueFollowUp(
  message: string,
  context: NichConversationContext,
): ContextResolution | null {
  const normalizedMessage =
    normalizeText(message);

  const referencesPreviousValue =
    normalizedMessage.includes(
      "around that value",
    ) ||
    normalizedMessage.includes(
      "near that value",
    ) ||
    normalizedMessage.includes(
      "close to that value",
    ) ||
    normalizedMessage.includes(
      "similar value",
    );

  if (
    !referencesPreviousValue ||
    context.lastNumericValue === undefined
  ) {
    return null;
  }

  return {
    message: `Find pets around ${context.lastNumericValue} value`,
    usedContext: true,
    expired: false,
  };
}

function resolvePronouns(
  message: string,
  context: NichConversationContext,
) {
  const lastPet = getLastPet(context);

  if (!lastPet) {
    return {
      message,
      usedContext: false,
    };
  }

  let resolvedMessage = message;
  let usedContext = false;

  const replacements: Array<{
    expression: RegExp;
    replacement: string;
  }> = [
    {
      expression: /\bthat pet\b/gi,
      replacement: formatContextPet(lastPet),
    },
    {
      expression: /\bthis pet\b/gi,
      replacement: formatContextPet(lastPet),
    },
    {
      expression: /\bthe pet\b/gi,
      replacement: formatContextPet(lastPet),
    },
    {
      expression: /\bit\b/gi,
      replacement: formatContextPet(lastPet),
    },
  ];

  for (const {
    expression,
    replacement,
  } of replacements) {
    if (!expression.test(resolvedMessage)) {
      continue;
    }

    expression.lastIndex = 0;

    resolvedMessage =
      resolvedMessage.replace(
        expression,
        replacement,
      );

    usedContext = true;
  }

  return {
    message: resolvedMessage,
    usedContext,
  };
}

export function resolveContextualMessage({
  message,
  context,
}: NichBrainInput): ContextResolution {
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return {
      message: trimmedMessage,
      usedContext: false,
      expired: false,
    };
  }

  if (isContextExpired(context)) {
    return {
      message: trimmedMessage,
      usedContext: false,
      expired: true,
    };
  }

  const directResolvers = [
    resolveCompareFirstTwo,
    resolveCompareThose,
    resolveVariantFollowUp,
    resolveMakeAllVariant,
    resolveNearbyValueFollowUp,
  ];

  for (const resolver of directResolvers) {
    const result = resolver(
      trimmedMessage,
      context,
    );

    if (result) {
      return result;
    }
  }

  const ordinalResolution =
    resolveOrdinalReferences(
      trimmedMessage,
      context,
    );

  const pronounResolution =
    resolvePronouns(
      ordinalResolution.message,
      context,
    );

  return {
    message: pronounResolution.message,
    usedContext:
      ordinalResolution.usedContext ||
      pronounResolution.usedContext,
    expired: false,
  };
}

export default resolveContextualMessage;