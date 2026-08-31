"use client";

import GameModeSwitch from "./games/GameModeSwitch";

/**
 * Backwards-compatible alias for the shared game switch.
 *
 * This file used to hold its own copy of the Adopt Me ↔ MM2 control, rendered
 * inside the default home hero — which is exactly why the switch vanished under
 * every other appearance. The real control now lives in
 * `components/games/GameModeSwitch.tsx` and is rendered by the shared shells.
 *
 * The alias stays so nothing that still imports the old name silently grows a
 * second, differently-behaved switch.
 */
export default function GameSwitcher() {
  return <GameModeSwitch variant="inline" className="my-6" />;
}
