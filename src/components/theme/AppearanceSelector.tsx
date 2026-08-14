"use client";

import { CSBT_THEMES, type CSBTTheme } from "../../lib/theme";
import { useCSBTTheme } from "../ThemeProvider";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AppearanceSelector({ open, onClose }: Props) {
  const { theme, setTheme } = useCSBTTheme();
  if (!open) return null;

  const choose = (next: CSBTTheme) => {
    setTheme(next);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-3 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="csbt-appearance-title">
      <button type="button" aria-label="Close appearance selector" onClick={onClose} className="absolute inset-0 bg-slate-950/58 backdrop-blur-sm" />
      <section className="csbt-appearance-panel relative z-10 w-full max-w-[560px] overflow-hidden rounded-[24px] border border-[var(--border-strong)] bg-[var(--surface-2)] p-4 shadow-[var(--shadow-lg)] sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="csbt-eyebrow">Personalize CSBT</p>
            <h2 id="csbt-appearance-title" className="mt-1 text-xl font-black tracking-[-.025em] text-[var(--foreground)] sm:text-2xl">Appearance</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--foreground-muted)] sm:text-sm">Choose the visual personality you want. Your pages and data stay exactly the same.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-[var(--surface-3)] text-xl font-black text-[var(--foreground)]" aria-label="Close">×</button>
        </div>

        <div className="mt-5 grid gap-2.5">
          {(Object.values(CSBT_THEMES) as Array<(typeof CSBT_THEMES)[CSBTTheme]>).map((option) => {
            const selected = theme === option.id;
            return (
              <button
                type="button"
                key={option.id}
                onClick={() => choose(option.id)}
                aria-pressed={selected}
                className={`group flex min-h-[72px] w-full items-center gap-3 rounded-[17px] border p-3 text-left transition sm:p-4 ${selected ? "border-[var(--border-gold)] bg-[var(--surface-selected)] shadow-[var(--shadow-gold)]" : "border-[var(--border)] bg-[var(--surface-3)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"}`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[var(--surface-2)] text-xl shadow-sm" aria-hidden="true">{option.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <strong className="text-sm font-black text-[var(--foreground)]">{option.label}</strong>
                    {selected && <span className="csbt-badge csbt-badge-gold">Selected</span>}
                  </span>
                  <span className="mt-1 block text-[11px] font-semibold text-[var(--foreground-muted)]">{option.description}</span>
                  <span className="mt-2 flex items-center gap-1.5" aria-label={`${option.label} color preview`}>
                    {option.swatches.map((color) => <span key={color} className="h-3.5 w-7 rounded-full border border-black/10 shadow-sm dark:border-white/10" style={{ backgroundColor: color }} />)}
                  </span>
                </span>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-black ${selected ? "border-[var(--gold)] bg-[var(--gold)] text-slate-950" : "border-[var(--border-strong)] text-transparent"}`} aria-hidden="true">✓</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
