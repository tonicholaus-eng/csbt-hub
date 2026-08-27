"use client";

import { usePathname, useRouter } from "next/navigation";

export default function GameSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const game = pathname.startsWith("/mm2") ? "mm2" : "adopt";

  return (
    <div className="flex justify-center gap-4 my-6">
      <button
        type="button"
        onClick={() => router.push("/")}
        aria-pressed={game === "adopt"}
        className={`
          px-8 py-3 rounded-xl border transition-all
          ${
            game === "adopt"
              ? "bg-white text-yellow-600 shadow-lg"
              : "bg-white/10 text-white hover:bg-white/15"
          }
        `}
      >
        🐾 Adopt Me
      </button>

      <button
        type="button"
        onClick={() => router.push("/mm2")}
        aria-pressed={game === "mm2"}
        className={`
          px-8 py-3 rounded-xl border transition-all
          ${
            game === "mm2"
              ? "bg-red-500 text-white shadow-lg"
              : "bg-white/10 text-white hover:bg-white/15"
          }
        `}
      >
        🔪 MM2
      </button>
    </div>
  );
}
