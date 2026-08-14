export const birthdayEvent = {
  enabled: true,
  person: {
    name: "Avi",
    birthdayDisplay: "August 15",
    birthdayDate: "2026-08-15",
  },
  message: "HAPPY BIRTHDAY, FROM PINAKA POGING NICH CAST 😜",
  eventStart: "2026-08-14T00:00:00+08:00",
  eventEnd: "2026-08-15T23:59:59+08:00",
} as const;

const birthdayEventKey = `${birthdayEvent.person.birthdayDate}-${birthdayEvent.person.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
export const BIRTHDAY_EVENT_SEEN_KEY = `csbt-birthday-event-${birthdayEventKey}-seen`;
export const BIRTHDAY_EVENT_OPEN = "csbt-birthday-event-open";
export const BIRTHDAY_EVENT_PENDING_KEY = `csbt-birthday-event-${birthdayEventKey}-pending`;

export type BirthdayEventView = "main" | "gift" | "nich";

export const birthdayEventStartMs = Date.parse(birthdayEvent.eventStart);
export const birthdayEventEndMs = Date.parse(birthdayEvent.eventEnd);
export const birthdayEventEndExclusiveMs = birthdayEventEndMs + 1000;

export function isBirthdayEventActive(now: number | Date = Date.now()) {
  if (!birthdayEvent.enabled) return false;
  const timestamp = now instanceof Date ? now.getTime() : now;
  return timestamp >= birthdayEventStartMs && timestamp < birthdayEventEndExclusiveMs;
}

export function openBirthdayEvent(view: BirthdayEventView = "main") {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.setItem(BIRTHDAY_EVENT_PENDING_KEY, view); } catch {}
  window.dispatchEvent(new CustomEvent(BIRTHDAY_EVENT_OPEN, { detail: { view } }));
}

export const birthdayDisplayDate = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(`${birthdayEvent.person.birthdayDate}T00:00:00Z`));
