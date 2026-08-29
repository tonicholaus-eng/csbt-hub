import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_MM2_SESSION_MESSAGES,
  MM2_NICH_SESSION_KEY,
  MM2_NICH_SESSION_VERSION,
  clearMM2Session,
  createMM2Session,
  readMM2Session,
  sanitizeMM2Session,
  writeMM2Session,
  type MM2SessionMessage,
} from "../src/lib/nich/mm2/session";
import { routeNichForGame } from "../src/lib/nich/gameRouter";
import { createMM2Context, type MM2NichContext } from "../src/lib/nich/mm2/context";
import { isMM2ResponseMeta } from "../src/lib/nich/responseMeta";
import { mm2Catalog } from "../src/lib/mm2/catalog";

// ---------------------------------------------------------------------------
// A minimal localStorage, so the storage functions run for real rather than
// being mocked away. Node has no `window`; the module only touches it behind a
// `typeof window === "undefined"` guard, which is exactly what test 17 checks.
// ---------------------------------------------------------------------------

class MemoryStorage {
  private store = new Map<string, string>();
  /** Set to make every operation throw, mimicking private-browsing/quota. */
  hostile = false;

  getItem(key: string): string | null {
    if (this.hostile) throw new Error("storage disabled");
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.hostile) throw new Error("quota exceeded");
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    if (this.hostile) throw new Error("storage disabled");
    this.store.delete(key);
  }
  raw(key: string) {
    return this.store.get(key);
  }
  keys() {
    return [...this.store.keys()];
  }
  seed(key: string, value: string) {
    this.store.set(key, value);
  }
  reset() {
    this.store.clear();
    this.hostile = false;
  }
}

const storage = new MemoryStorage();

function withBrowser<T>(run: () => T): T {
  const globals = globalThis as { window?: unknown; localStorage?: unknown };
  const hadWindow = "window" in globals;
  globals.window = { localStorage: storage };
  try {
    return run();
  } finally {
    if (!hadWindow) delete globals.window;
  }
}

function freshBrowser() {
  storage.reset();
}

/** One real deterministic turn, shaped as the console stores it. */
function turn(message: string, context: MM2NichContext) {
  const result = routeNichForGame({ gameId: "mm2", message, context });
  const meta = isMM2ResponseMeta(result.response.meta) ? result.response.meta : undefined;

  const user: MM2SessionMessage = {
    id: `u-${message}`,
    role: "user",
    text: message,
    createdAt: 1,
  };
  const nich: MM2SessionMessage = {
    id: `n-${message}`,
    role: "nich",
    text: result.response.text,
    createdAt: 2,
    sources: meta?.sources,
    channel: meta?.channel,
    structured: meta?.structured,
  };

  return { messages: [user, nich], context: result.context as MM2NichContext, meta };
}

const mm2 = (name: string) => {
  const item = mm2Catalog.find((entry) => entry.NAME.toLowerCase() === name.toLowerCase());
  assert.ok(item, `MM2 catalog is missing "${name}"`);
  return item;
};

// ---------------------------------------------------------------------------
// 1-2 — messages and structured context both survive a reload
// ---------------------------------------------------------------------------

test("MM2 messages survive a simulated reload", () => {
  freshBrowser();
  withBrowser(() => {
    const first = turn("harvester value", createMM2Context());
    writeMM2Session({ messages: first.messages, context: first.context });

    // "Reload": a brand new read, with only storage carrying anything over.
    const restored = readMM2Session();

    assert.equal(restored.messages.length, 2);
    assert.equal(restored.messages[0].role, "user");
    assert.equal(restored.messages[0].text, "harvester value");
    assert.equal(restored.messages[1].role, "nich");
    assert.match(restored.messages[1].text, /Harvester/);
  });
});

test("the active-item context survives the same reload", () => {
  freshBrowser();
  withBrowser(() => {
    const first = turn("harvester value", createMM2Context());
    writeMM2Session({ messages: first.messages, context: first.context });

    const restored = readMM2Session();
    assert.equal(restored.context.gameId, "mm2");
    assert.ok(restored.context.recentItemIds?.includes(mm2("Harvester").ID));
    assert.equal(restored.context.lastValueSource, "SUPREME");
  });
});

// ---------------------------------------------------------------------------
// 3 — the follow-up after reload still resolves the previous weapon
//
// This is the bug's real success criterion: restoring the transcript is not
// enough if the memory underneath it does not continue working.
// ---------------------------------------------------------------------------

test("a follow-up after reload resolves the weapon from before the reload", () => {
  freshBrowser();
  withBrowser(() => {
    const first = turn("harvester value", createMM2Context());
    writeMM2Session({ messages: first.messages, context: first.context });

    // Reload, then ask a follow-up that names no weapon at all.
    const restored = readMM2Session();
    const followUp = turn("gcash?", restored.context);

    assert.match(followUp.messages[1].text, /Harvester/);
    assert.match(
      followUp.messages[1].text,
      new RegExp(mm2("Harvester").GCASH_VALUE!.toLocaleString("en-US")),
    );
    assert.deepEqual(followUp.meta?.sources, ["LOCAL MM2 ENGINE", "GCASH DATABASE"]);
  });
});

// ---------------------------------------------------------------------------
// 4 — comparison context survives
// ---------------------------------------------------------------------------

test("comparison context survives a reload", () => {
  freshBrowser();
  withBrowser(() => {
    const compare = turn("compare harvester and icepiercer", createMM2Context());
    assert.equal(compare.meta?.structured?.kind, "comparison");
    writeMM2Session({ messages: compare.messages, context: compare.context });

    const restored = readMM2Session();
    assert.equal(restored.context.comparisonItemIds?.length, 2);

    const followUp = turn("which has better demand?", restored.context);
    assert.match(followUp.messages[1].text, /Harvester/);
    assert.match(followUp.messages[1].text, /Icepiercer/);
    assert.match(followUp.messages[1].text, /demand/i);
  });
});

// ---------------------------------------------------------------------------
// 5 — trade-session context survives
// ---------------------------------------------------------------------------

test("trade-session context survives a reload and can be extended", () => {
  freshBrowser();
  withBrowser(() => {
    const trade = turn("my harvester for their icebreaker", createMM2Context());
    assert.equal(trade.meta?.structured?.kind, "trade");
    writeMM2Session({ messages: trade.messages, context: trade.context });

    const restored = readMM2Session();
    assert.ok(restored.context.lastTrade, "the trade session was not persisted");
    assert.equal(restored.context.lastTrade?.yourItemIds.length, 1);
    assert.equal(restored.context.lastTrade?.theirItemIds.length, 1);
    assert.equal(restored.context.lastTrade?.valueSource, "SUPREME");

    // The weapons are still resolvable, so a follow-up trade works.
    const followUp = turn("my harvester for their batwing", restored.context);
    assert.equal(followUp.meta?.structured?.kind, "trade");
  });
});

// ---------------------------------------------------------------------------
// 6-8 — Clear Session
// ---------------------------------------------------------------------------

test("Clear Session removes the persisted messages and context, and stays empty", () => {
  freshBrowser();
  withBrowser(() => {
    const first = turn("harvester value", createMM2Context());
    writeMM2Session({ messages: first.messages, context: first.context });
    assert.equal(readMM2Session().messages.length, 2);

    clearMM2Session();

    const afterClear = readMM2Session();
    assert.deepEqual(afterClear.messages, []);
    assert.deepEqual(afterClear.context.recentItemIds, []);
    assert.equal(afterClear.context.lastTrade, undefined);
    assert.equal(afterClear.consumedQuery, undefined);

    // "Refresh" after clearing must not resurrect anything.
    assert.deepEqual(readMM2Session().messages, []);
    assert.equal(storage.raw(MM2_NICH_SESSION_KEY), undefined);
  });
});

test("Clear Session also drops the legacy context key so it cannot migrate back", () => {
  freshBrowser();
  withBrowser(() => {
    // The pre-fix key, which the reader migrates from.
    storage.seed(
      "csbt-hub:nich-context:mm2:v1",
      JSON.stringify({ gameId: "mm2", recentItemIds: [mm2("Harvester").ID], turnCount: 3 }),
    );
    assert.ok(readMM2Session().context.recentItemIds?.length, "migration did not run");

    clearMM2Session();
    assert.deepEqual(readMM2Session().context.recentItemIds, []);
  });
});

test("Clear Session never touches Adopt Me storage", () => {
  freshBrowser();
  withBrowser(() => {
    storage.seed("csbt-hub:nich-chat:v2", JSON.stringify({ version: 2, messages: [], context: {} }));
    storage.seed("csbt-hub:nich-memory:v1:guest", JSON.stringify({ aliases: {} }));

    writeMM2Session({ messages: [], context: createMM2Context() });
    clearMM2Session();

    assert.ok(storage.raw("csbt-hub:nich-chat:v2"), "the Adopt Me chat was cleared");
    assert.ok(storage.raw("csbt-hub:nich-memory:v1:guest"), "Adopt Me memory was cleared");
  });
});

// ---------------------------------------------------------------------------
// 9-10 — cross-game hydration is impossible
// ---------------------------------------------------------------------------

test("an Adopt Me record cannot hydrate the MM2 console", () => {
  // Shape of a persisted Adopt Me chat, offered as an MM2 session.
  const adoptMeRecord = {
    version: 2,
    savedAt: Date.now(),
    messages: [
      { id: "1", sender: "user", text: "frost dragon value", createdAt: 1 },
      { id: "2", sender: "nich", text: "Frost Dragon is 3,700 in GCash value.", createdAt: 2 },
    ],
    context: { lastPetName: "Frost Dragon", recentPets: [{ petName: "Frost Dragon" }], turnCount: 4 },
  };

  const session = sanitizeMM2Session(adoptMeRecord);

  // Rejected on version *and* on the missing MM2 game tag.
  assert.deepEqual(session.messages, []);
  assert.equal(session.context.gameId, "mm2");
  assert.deepEqual(session.context.recentItemIds, []);
  assert.equal((session.context as unknown as { lastPetName?: string }).lastPetName, undefined);
});

test("an MM2 record is rejected if it is not tagged as MM2", () => {
  const untagged = {
    version: MM2_NICH_SESSION_VERSION,
    gameId: "adopt-me",
    savedAt: Date.now(),
    messages: [{ id: "1", role: "user", text: "harvester value", createdAt: 1 }],
    context: createMM2Context(),
  };
  assert.deepEqual(sanitizeMM2Session(untagged).messages, []);
});

test("MM2 writes to its own key and never to Adopt Me's", () => {
  freshBrowser();
  withBrowser(() => {
    writeMM2Session({ messages: [], context: createMM2Context() });
    assert.deepEqual(storage.keys(), [MM2_NICH_SESSION_KEY]);
    assert.match(MM2_NICH_SESSION_KEY, /:mm2:/);
  });
});

// ---------------------------------------------------------------------------
// 11-12 — corrupt and unsupported data fail safely
// ---------------------------------------------------------------------------

test("malformed persisted JSON does not crash", () => {
  freshBrowser();
  withBrowser(() => {
    storage.seed(MM2_NICH_SESSION_KEY, "{not json at all");
    const session = readMM2Session();
    assert.deepEqual(session.messages, []);
    assert.equal(session.context.gameId, "mm2");
  });
});

test("an unsupported persistence version fails safely", () => {
  freshBrowser();
  withBrowser(() => {
    storage.seed(
      MM2_NICH_SESSION_KEY,
      JSON.stringify({
        version: MM2_NICH_SESSION_VERSION + 99,
        gameId: "mm2",
        messages: [{ id: "1", role: "user", text: "harvester value", createdAt: 1 }],
        context: createMM2Context(),
      }),
    );
    assert.deepEqual(readMM2Session().messages, []);
  });
});

test("hostile storage is survivable in both directions", () => {
  freshBrowser();
  withBrowser(() => {
    storage.hostile = true;
    assert.deepEqual(readMM2Session().messages, []);
    assert.doesNotThrow(() => writeMM2Session({ messages: [], context: createMM2Context() }));
    assert.doesNotThrow(() => clearMM2Session());
  });
});

test("garbage inside otherwise valid records is dropped, not rendered", () => {
  const session = sanitizeMM2Session({
    version: MM2_NICH_SESSION_VERSION,
    gameId: "mm2",
    savedAt: 1,
    context: createMM2Context(),
    messages: [
      { id: "ok", role: "user", text: "harvester value", createdAt: 1 },
      { id: "no-role", text: "orphan", createdAt: 1 },
      { role: "nich", text: "no id", createdAt: 1 },
      { id: "empty", role: "nich", text: "", createdAt: 1 },
      // A source label that is not one of ours, and a bogus channel.
      { id: "bad-meta", role: "nich", text: "x", createdAt: 1, sources: ["ORACLE OF TRUTH"], channel: "PSYCHIC" },
      // A structured card with the wrong kind.
      { id: "bad-card", role: "nich", text: "y", createdAt: 1, structured: { kind: "nonsense" } },
    ],
  });

  assert.deepEqual(session.messages.map((message) => message.id), ["ok", "bad-meta", "bad-card"]);
  const badMeta = session.messages.find((message) => message.id === "bad-meta")!;
  assert.equal(badMeta.sources, undefined, "an unknown provenance label must not be rendered");
  assert.equal(badMeta.channel, undefined);
  assert.equal(session.messages.find((message) => message.id === "bad-card")!.structured, undefined);
});

test("a tampered href cannot escape the MM2 routes", () => {
  const session = sanitizeMM2Session({
    version: MM2_NICH_SESSION_VERSION,
    gameId: "mm2",
    savedAt: 1,
    context: createMM2Context(),
    messages: [
      {
        id: "x",
        role: "nich",
        text: "value",
        createdAt: 1,
        structured: {
          kind: "item",
          focus: "SUPREME",
          item: {
            id: "mm2-harvester-ancient",
            name: "Harvester",
            category: "ANCIENT",
            supreme: 250,
            gcash: 320,
            demand: 3,
            href: "javascript:alert(1)",
          },
        },
      },
    ],
  });

  const card = session.messages[0].structured;
  assert.equal(card?.kind, "item");
  if (card?.kind !== "item") return;
  assert.equal(card.item.href, "/mm2/values/mm2-harvester-ancient");
});

// ---------------------------------------------------------------------------
// 13-14 — the forwarded homepage query is consumed exactly once
// ---------------------------------------------------------------------------

test("a forwarded query is recorded as consumed and not repeated after reload", () => {
  freshBrowser();
  withBrowser(() => {
    const forwarded = "harvester value";

    // First visit: the console runs it and records it with the session.
    const first = turn(forwarded, createMM2Context());
    writeMM2Session({ messages: first.messages, context: first.context, consumedQuery: forwarded });

    // "Refresh" with the same ?q= still in the URL.
    const restored = readMM2Session();
    assert.equal(restored.consumedQuery, forwarded);

    // This is the check the console performs before re-asking.
    const wouldReask = restored.consumedQuery !== forwarded;
    assert.equal(wouldReask, false, "the same forwarded query must not run twice");

    // And the transcript still holds exactly one copy of it.
    assert.equal(restored.messages.filter((message) => message.text === forwarded).length, 1);
  });
});

test("a different forwarded query is still allowed to run", () => {
  freshBrowser();
  withBrowser(() => {
    writeMM2Session({ messages: [], context: createMM2Context(), consumedQuery: "harvester value" });
    const restored = readMM2Session();
    assert.notEqual(restored.consumedQuery, "icebreaker value");
  });
});

// ---------------------------------------------------------------------------
// 15-16 — restored cards and provenance
// ---------------------------------------------------------------------------

test("restored structured cards keep the engine's exact numbers", () => {
  freshBrowser();
  withBrowser(() => {
    const harvester = mm2("Harvester");

    for (const message of ["harvester value", "harvester vs icepiercer", "top 5 godlies", "my harvester for their icebreaker"]) {
      const produced = turn(message, createMM2Context());
      writeMM2Session({ messages: produced.messages, context: produced.context });

      const restored = readMM2Session().messages[1];
      assert.deepEqual(
        restored.structured,
        produced.meta?.structured,
        `the ${message} card did not round-trip`,
      );
    }

    // Spot-check the item card's numbers against the catalog itself.
    const value = turn("harvester value", createMM2Context());
    writeMM2Session({ messages: value.messages, context: value.context });
    const card = readMM2Session().messages[1].structured;
    assert.equal(card?.kind, "item");
    if (card?.kind !== "item") return;
    assert.equal(card.item.supreme, harvester.SOURCE_VALUE);
    assert.equal(card.item.gcash, harvester.GCASH_VALUE);
    assert.equal(card.item.demand, harvester.DEMAND);
  });
});

test("response-source metadata survives the reload rather than being re-guessed", () => {
  freshBrowser();
  withBrowser(() => {
    const cases: Array<[string, string[], string]> = [
      ["harvester value", ["LOCAL MM2 ENGINE", "SUPREME VALUES"], "LOCAL"],
      ["my harvester for their icebreaker", ["TRADE ENGINE", "SUPREME VALUES"], "LOCAL"],
      ["top 5 godlies", ["MM2 CATALOG", "SUPREME VALUES"], "LOCAL"],
      // The local brain declines this one, so it is the AI row. The decline path
      // stamps the AI provenance up front, which is what has to survive.
      ["any advice for a new trader?", ["NICH AI", "MM2 CONTEXT"], "AI"],
    ];

    assert.equal(
      routeNichForGame({ gameId: "mm2", message: cases[3][0], context: createMM2Context() })
        .handledLocally,
      false,
      "the AI case must be a message the local brain actually declines",
    );

    for (const [message, sources, channel] of cases) {
      const produced = turn(message, createMM2Context());
      writeMM2Session({ messages: produced.messages, context: produced.context });

      const restored = readMM2Session().messages[1];
      assert.deepEqual(restored.sources, sources, `wrong restored provenance for "${message}"`);
      assert.equal(restored.channel, channel, `wrong restored channel for "${message}"`);
    }
  });
});

// ---------------------------------------------------------------------------
// 17 — no SSR access, and transient state is not persisted
// ---------------------------------------------------------------------------

test("the session module never touches localStorage on the server", () => {
  const globals = globalThis as { window?: unknown };
  assert.equal("window" in globals, false, "the test environment leaked a window");

  // With no window at all, every entry point is a safe no-op.
  assert.doesNotThrow(() => readMM2Session());
  assert.deepEqual(readMM2Session().messages, []);
  assert.doesNotThrow(() => writeMM2Session({ messages: [], context: createMM2Context() }));
  assert.doesNotThrow(() => clearMM2Session());
});

test("transient console state is not part of the persisted record", () => {
  freshBrowser();
  withBrowser(() => {
    const first = turn("harvester value", createMM2Context());
    writeMM2Session({ messages: first.messages, context: first.context });

    const raw = storage.raw(MM2_NICH_SESSION_KEY)!;
    for (const transient of ["pending", "activity", "THINKING", "QUERYING MM2 DATABASE", "draft"]) {
      assert.doesNotMatch(raw, new RegExp(transient), `"${transient}" must not be persisted`);
    }

    assert.deepEqual(Object.keys(JSON.parse(raw)).sort(), [
      "context",
      "gameId",
      "messages",
      "savedAt",
      "version",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Bounds
// ---------------------------------------------------------------------------

test("history is capped, keeping the most recent turns", () => {
  freshBrowser();
  withBrowser(() => {
    const messages: MM2SessionMessage[] = Array.from({ length: MAX_MM2_SESSION_MESSAGES + 40 }, (_, index) => ({
      id: `m${index}`,
      role: index % 2 === 0 ? ("user" as const) : ("nich" as const),
      text: `message ${index}`,
      createdAt: index,
    }));

    writeMM2Session({ messages, context: createMM2Context() });
    const restored = readMM2Session();

    assert.equal(restored.messages.length, MAX_MM2_SESSION_MESSAGES);
    // The newest are the ones kept — dropping those would lose the context a
    // follow-up depends on.
    assert.equal(restored.messages.at(-1)!.id, `m${messages.length - 1}`);
  });
});

test("an oversized transcript is trimmed rather than failing to save", () => {
  freshBrowser();
  withBrowser(() => {
    const fat = "x".repeat(7_000);
    const messages: MM2SessionMessage[] = Array.from({ length: MAX_MM2_SESSION_MESSAGES }, (_, index) => ({
      id: `m${index}`,
      role: "nich" as const,
      text: fat,
      createdAt: index,
    }));

    writeMM2Session({ messages, context: createMM2Context() });
    const raw = storage.raw(MM2_NICH_SESSION_KEY);

    assert.ok(raw, "an oversized session was dropped instead of trimmed");
    assert.ok(raw!.length <= 256_000, `stored ${raw!.length} bytes`);
    assert.ok(readMM2Session().messages.length > 0, "trimming removed everything");
  });
});

test("a fresh session is a valid empty MM2 session", () => {
  const session = createMM2Session();
  assert.equal(session.version, MM2_NICH_SESSION_VERSION);
  assert.equal(session.gameId, "mm2");
  assert.deepEqual(session.messages, []);
  assert.equal(session.context.gameId, "mm2");
});
