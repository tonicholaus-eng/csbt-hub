/**
 * MM2 NICH conversation harness.
 *
 * Runs whole conversations through the real router and prints what NICH
 * understood alongside what it said. It exists because the interesting failures
 * in a conversational assistant are never visible in a single turn — a wrong
 * answer on turn four is usually a wrong *reading* on turn two, and the debug
 * trace is what makes that difference visible.
 *
 *   npm run test:mm2-nich            # the built-in scenario matrix
 *   npm run test:mm2-nich -- --debug # with the interpretation behind each turn
 *   npm run test:mm2-nich -- "harv value" "what about demand"
 *
 * Nothing here asserts; the assertions live in tests/mm2NichSemantic.test.ts.
 * This is for reading.
 */

import { routeNichForGame } from "../src/lib/nich/gameRouter";
import { createMM2Context, type MM2NichContext } from "../src/lib/nich/mm2/context";
import { isMM2ResponseMeta } from "../src/lib/nich/responseMeta";

const SCENARIOS: Array<{ title: string; turns: string[] }> = [
  {
    title: "Values, in the words people use",
    turns: ["how much is harv rn", "what about gcash", "and demand?", "is it easy to trade"],
  },
  {
    title: "Comparison and follow-ups",
    turns: ["harvester vs icepiercer", "which has better demand", "compare it to corrupt", "which should i keep"],
  },
  {
    title: "A trade, argued over",
    turns: [
      "bro he wants my harv for his corrupt and batwing, would u",
      "what if they remove batwing",
      "how much should they add",
      "give me options",
    ],
  },
  {
    title: "Inventory",
    turns: [
      "i have 2 icebreakers and a batwing",
      "how much are those together",
      "what can i get for all of them",
      "which one has the worst demand",
    ],
  },
  {
    title: "Recommendations",
    turns: [
      "give me something around 1k",
      "the first one",
      "something like harvester but cheaper",
      "what should i upgrade into",
    ],
  },
  {
    title: "Corrections and ambiguity",
    turns: ["icebreaker value", "nah i meant icepiercer", "what about icep", "rainbowgun"],
  },
  {
    title: "Things that must NOT happen",
    turns: [
      "dont compare harvester",
      "someone said harvester is 5k lol",
      "i used to have icepiercer",
      "frost dragon value",
      "am i cooked",
    ],
  },
];

function run(turns: string[], showDebug: boolean) {
  let context: MM2NichContext = createMM2Context();

  for (const message of turns) {
    const result = routeNichForGame({ gameId: "mm2", message, context });
    context = result.context as MM2NichContext;
    const meta = isMM2ResponseMeta(result.response.meta) ? result.response.meta : undefined;

    console.log(`\n[36m> ${message}[0m`);
    if (showDebug && meta?.debug) {
      const debug = meta.debug;
      console.log(
        `[90m  [${debug.path}] ${debug.intent} (${debug.confidence}) · route ${debug.route}` +
          `${debug.targets.length ? ` · targets ${debug.targets.join(", ")}` : ""}` +
          `${debug.references.length ? ` · refs ${debug.references.map((reference) => `${reference.phrase}→${reference.resolved.join("/") || "?"}`).join(", ")}` : ""}` +
          `${debug.unresolved.length ? ` · unresolved ${debug.unresolved.join(", ")}` : ""}[0m`,
      );
    }
    console.log(`  [${result.handledLocally ? "LOCAL" : "AI"}] ${result.response.text.split("\n").join("\n  ")}`);
  }
}

const args = process.argv.slice(2);
const showDebug = args.includes("--debug");
const custom = args.filter((argument) => !argument.startsWith("--"));

if (custom.length) {
  run(custom, showDebug);
} else {
  for (const scenario of SCENARIOS) {
    console.log(`\n${"=".repeat(72)}\n${scenario.title}\n${"=".repeat(72)}`);
    run(scenario.turns, showDebug);
  }
}
