import MM2Navbar from "./MM2Navbar";

type Measure = "standard" | "wide" | "flush";

/**
 * The MM2 page shell.
 *
 * Every MM2 route previously repeated the same `<main>` + `<MM2Navbar/>` +
 * `lg:pl-[288px]` scaffold by hand and picked its own content width — seven
 * different max-widths across ten routes, so no two MM2 pages shared a column.
 * This centralises the scaffold and reduces the widths to two tiers:
 *
 *   standard — reading and analysis surfaces (values, profile, demand,
 *              calculator, opinions, middleman, moderation)
 *   wide     — dense multi-pane workspaces (exchange, listing, rooms, lounge)
 *   flush    — surfaces that manage their own full-bleed composition (home)
 *
 * `social` opts a route into `.mm2-social-mode`, the token bridge that lets the
 * shared Adopt-Me-authored community engines render in MM2's palette. It is
 * additive: no shared component's behaviour changes.
 */
export default function MM2Shell({
  children,
  measure = "standard",
  social = false,
  className = "",
}: {
  children: React.ReactNode;
  measure?: Measure;
  social?: boolean;
  className?: string;
}) {
  return (
    <main
      className={`mm2-mode ${social ? "mm2-social-mode " : ""}min-h-screen overflow-x-hidden ${className}`}
    >
      <MM2Navbar />
      {/* No z-index here. `relative z-10` created a stacking context that
          trapped the weapon picker (z-100) underneath the control rail (z-50),
          clipping the modal behind the 288px rail on every desktop viewport. */}
      <div className="relative min-w-0 lg:pl-[288px]">
        <div
          className={`mm2-shell-measure ${social ? "csbt-app-workspace" : "mm2-shell-body"}`}
          data-measure={measure}
        >
          {children}
        </div>
      </div>
    </main>
  );
}
