import MM2Shell from "../../components/mm2/MM2Shell";

/**
 * MM2 previously had no loading boundary, so a slow MM2 segment fell through to
 * the root one — which paints the Adopt Me shell. This keeps the control rail
 * and the MM2 surface in place while a segment resolves.
 */
export default function MM2Loading() {
  return (
    <MM2Shell measure="standard">
      <div className="space-y-6" aria-label="Loading MM2" aria-busy="true">
        <div className="h-9 w-64 animate-pulse rounded-[10px] bg-white/[0.05]" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-white/[0.035]" />
        <div className="h-[120px] animate-pulse rounded-[20px] border border-[var(--mm2-edge)] bg-[var(--mm2-panel)]" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-[132px] animate-pulse rounded-[18px] border border-[var(--mm2-edge)] bg-[var(--mm2-panel)]"
            />
          ))}
        </div>
      </div>
    </MM2Shell>
  );
}
