/** Shared text helpers used by the deterministic NICH brain. */

export function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function containsWholePhrase(message: string, phrase: string): boolean {
  const normalizedMessage = normalizeText(message);
  const normalizedPhrase = normalizeText(phrase);

  if (!normalizedMessage || !normalizedPhrase) {
    return false;
  }

  return new RegExp(
    `(?:^|\\s)${escapeRegExp(normalizedPhrase)}(?=$|\\s)`,
    "i",
  ).test(normalizedMessage);
}

export function includesAnyWholePhrase(
  message: string,
  phrases: readonly string[],
): boolean {
  return phrases.some((phrase) => containsWholePhrase(message, phrase));
}

export function isExactPhrase(
  message: string,
  phrases: readonly string[],
): boolean {
  const normalizedMessage = normalizeText(message);
  return phrases.some((phrase) => normalizedMessage === normalizeText(phrase));
}

export function startsWithAnyPhrase(
  message: string,
  phrases: readonly string[],
): boolean {
  const normalizedMessage = normalizeText(message);

  return phrases.some((phrase) => {
    const normalizedPhrase = normalizeText(phrase);
    return (
      normalizedMessage === normalizedPhrase ||
      normalizedMessage.startsWith(`${normalizedPhrase} `)
    );
  });
}

export function wordCount(value: string): number {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(" ").length : 0;
}

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function uniqueBy<T>(
  values: readonly T[],
  getKey: (value: T) => string,
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const value of values) {
    const key = getKey(value);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(value);
  }

  return result;
}

export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}

export function slugify(value: string): string {
  return normalizeText(value).replace(/\s+/g, "-");
}
