/**
 * The MM2 page header.
 *
 * MM2 previously opened each surface with a full-width bordered card, so
 * Trade Opinions and the Lounge stacked two or three header panels before any
 * content appeared. This is a signage bar instead of a card: a lit rule, an
 * eyebrow, the title, and one line of purpose — it introduces the page without
 * consuming a screen of it.
 */
export default function MM2PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-col gap-5 border-b border-[var(--mm2-edge)] pb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
      <div className="min-w-0">
        <p className="flex items-center gap-2.5 text-[11px] font-black uppercase tracking-[.2em] text-[var(--mm2-crimson-text)]">
          <span aria-hidden="true" className="h-px w-6 bg-[var(--mm2-crimson)]" />
          {eyebrow}
        </p>
        <h1 className="mt-2.5 text-[30px] font-black leading-[1.03] tracking-[-.04em] text-white sm:text-[38px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2.5 max-w-2xl text-[14.5px] font-medium leading-[1.6] text-[var(--mm2-ink-3)]">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div> : null}
    </header>
  );
}
