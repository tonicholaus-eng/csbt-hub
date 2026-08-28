import Image from "next/image";
import Link from "next/link";
import styles from "./MM2HQHome.module.css";
import MM2NichDesk from "./MM2NichDesk";

type MM2Item = {
  NAME: string;
  CATEGORY?: string;
  SOURCE_VALUE?: number | null;
  GCASH_VALUE?: number | null;
  DEMAND?: number | null;
};

type MM2Meta = {
  totalItems?: number;
  sourceName?: string;
  sourceFetchedAt?: string;
  categoryCounts?: Record<string, number>;
};

type IconKind = "values" | "lab" | "market" | "opinions" | "demand" | "lounge";

function SystemIcon({ kind }: { kind: IconKind }) {
  if (kind === "values") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 19 8-8M13 11l5-6 1 1-6 5" />
        <path d="m7 17-2-2M9 15l-2-2" />
      </svg>
    );
  }
  if (kind === "lab") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" />
        <path d="M8 15h8" />
      </svg>
    );
  }
  if (kind === "market") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 8h12M13 5l3 3-3 3" />
        <path d="M20 16H8M11 13l-3 3 3 3" />
      </svg>
    );
  }
  if (kind === "opinions") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 5.5h14v10H9l-4 3v-13Z" />
        <path d="M9 10.5h.01M12 10.5h.01M15 10.5h.01" />
      </svg>
    );
  }
  if (kind === "demand") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M22 12h-3M12 22v-3M2 12h3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8.5" cy="8" r="3" />
      <circle cx="17" cy="10" r="2.2" />
      <path d="M3 20c.5-4.2 2.4-6.3 5.5-6.3S13.5 15.8 14 20M14 15.5c3.4-.3 5.5 1.2 6.5 4.5" />
    </svg>
  );
}

function formatValue(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("en-US")
    : "N/A";
}

function getDemandSignal(demand?: number | null) {
  if (typeof demand !== "number") {
    return { label: "UNRATED", tone: "quiet" as const, symbol: "•" };
  }
  if (demand >= 6) {
    return { label: "HOT", tone: "hot" as const, symbol: "▲" };
  }
  if (demand >= 3) {
    return { label: "ACTIVE", tone: "warm" as const, symbol: "◆" };
  }
  return { label: "QUIET", tone: "quiet" as const, symbol: "•" };
}

export default function MM2HQHome({ items, meta }: { items: MM2Item[]; meta: MM2Meta }) {
  const totalItems = meta.totalItems ?? items.length;
  const source = meta.sourceName ?? "Supreme Values";
  const categoryCounts = meta.categoryCounts ?? {};
  const categoryCount =
    Object.keys(categoryCounts).length ||
    new Set(items.map((item) => item.CATEGORY).filter(Boolean)).size;

  const demandRated = items.filter((item) => typeof item.DEMAND === "number").length;
  const highDemand = items.filter((item) => typeof item.DEMAND === "number" && item.DEMAND >= 6).length;
  const midDemand = items.filter((item) => typeof item.DEMAND === "number" && item.DEMAND >= 3 && item.DEMAND < 6).length;
  const lowDemand = items.filter((item) => typeof item.DEMAND === "number" && item.DEMAND < 3).length;
  const gcashPriced = items.filter((item) => typeof item.GCASH_VALUE === "number").length;

  const demandCoverage = totalItems ? Math.round((demandRated / totalItems) * 100) : 0;
  const gcashCoverage = totalItems ? Math.round((gcashPriced / totalItems) * 100) : 0;
  const highDemandShare = demandRated ? Math.round((highDemand / demandRated) * 100) : 0;

  const syncedAt = meta.sourceFetchedAt ? new Date(meta.sourceFetchedAt) : null;
  const syncedOn =
    syncedAt && !Number.isNaN(syncedAt.getTime())
      ? syncedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "N/A";
  const syncedClock =
    syncedAt && !Number.isNaN(syncedAt.getTime())
      ? syncedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      : "--:--";

  const ranked = items
    .filter((item) => typeof item.SOURCE_VALUE === "number")
    .sort((a, b) => {
      const valueDelta = (b.SOURCE_VALUE ?? -1) - (a.SOURCE_VALUE ?? -1);
      return valueDelta || (b.DEMAND ?? -1) - (a.DEMAND ?? -1);
    });

  const topWeapon = ranked[0] ?? null;
  const valueLeaders = ranked.slice(0, 4);

  /* The radar micro chart is the real catalogue spread, not decoration: the
     seven largest weapon groups, scaled against the largest of them. */
  const categorySpread = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7);
  const categorySpreadPeak = categorySpread.reduce((peak, entry) => Math.max(peak, entry[1]), 0);

  const operations: Array<{
    kind: IconKind;
    href: string;
    title: string;
    detail: string;
    tag: string;
    index: string;
  }> = [
    {
      kind: "values",
      href: "/mm2/values",
      title: "Open Weapon Values",
      detail: "Search the complete MM2 catalogue",
      tag: "VALUE NETWORK",
      index: "01",
    },
    {
      kind: "lab",
      href: "/mm2/calculator",
      title: "Enter Trade Lab",
      detail: "Build both sides and analyze the result",
      tag: "TRADE ANALYSIS",
      index: "02",
    },
    {
      kind: "market",
      href: "/mm2/exchange",
      title: "Open Market",
      detail: "Browse MM2 listings and offers",
      tag: "MARKET FLOOR",
      index: "03",
    },
    {
      kind: "opinions",
      href: "/mm2/trade-opinions",
      title: "Community Intel",
      detail: "Ask traders for a W / F / L verdict",
      tag: "COMMUNITY INTEL",
      index: "04",
    },
  ];

  const quickAccess: Array<{ kind: IconKind; href: string; label: string }> = [
    { kind: "lab", href: "/mm2/calculator", label: "Calculator" },
    { kind: "values", href: "/mm2/values", label: "Price Checker" },
    { kind: "market", href: "/mm2/calculator", label: "Trade Builder" },
    { kind: "demand", href: "/mm2/demand", label: "Value Monitor" },
  ];

  /* Every telemetry meter below is a real ratio over the generated catalogue.
     Cells with no honest denominator show a caption instead of a bar. */
  const telemetry: Array<{
    label: string;
    value: string;
    caption: string;
    meter?: number;
    /** A word value (the source name) rather than a count — set smaller. */
    word?: boolean;
  }> = [
    {
      label: "WEAPONS TRACKED",
      value: totalItems.toLocaleString("en-US"),
      caption: "MM2 CATALOG",
    },
    {
      label: "CATEGORIES",
      value: String(categoryCount),
      caption: "WEAPON GROUPS",
    },
    {
      label: "VALUE SOURCE",
      value: source,
      caption: "SUPREME NETWORK",
      word: true,
    },
    {
      label: "GCASH PRICED",
      value: gcashPriced.toLocaleString("en-US"),
      caption: `${gcashCoverage}% COVERAGE`,
      meter: gcashCoverage,
    },
    {
      label: "HIGH DEMAND",
      value: highDemand.toLocaleString("en-US"),
      caption: `${highDemandShare}% OF RATED`,
      meter: highDemandShare,
    },
  ];

  return (
    <div className={styles.scene}>
      {/* The headquarters itself. Purely environmental: no data, no controls.
          Layers run back-to-front so the room reads as depth rather than as a
          stack of overlays. */}
      <div className={styles.environment} aria-hidden="true">
        {/* distant — corridor, back wall, cool light */}
        <div className={styles.coolDepth} />
        <div className={styles.rearCorridor} />
        <div className={styles.rearStructure} />
        <div className={styles.rearWallBayLeft} />
        <div className={styles.rearWallBayCenter} />
        <div className={styles.rearWallBayRight} />
        <div className={styles.distantMonitorCluster} />

        {/* mid — machinery, racks, recessed screens, side walls */}
        <div className={styles.farMachineLeft} />
        <div className={styles.farMachineRight} />
        <div className={styles.weaponRackLeft} />
        <div className={styles.weaponRackRight} />
        <div className={styles.recessedScreenLeft} />
        <div className={styles.recessedScreenRight} />
        <div className={styles.sideStructureLeft} />
        <div className={styles.sideStructureRight} />

        {/* ceiling — cropped by the viewport on purpose */}
        <div className={styles.ceilingArchitecture} />
        <div className={styles.ceilingTrusses} />
        <div className={styles.ceilingRibLeft} />
        <div className={styles.ceilingRibRight} />
        <div className={styles.overheadConduit} />

        {/* floor — the plane everything stands on */}
        <div className={styles.horizon} />
        <div className={styles.floorPlane} />
        <div className={styles.platformRunway} />
        <div className={styles.floorDockLeft} />
        <div className={styles.floorDockRight} />
        <div className={styles.floorStrips} />
        <div className={styles.floorReflection} />

        {/* light + air */}
        <div className={styles.vaultSpill} />
        <div className={styles.atmosphericHaze} />

        {/* foreground — cropped, never over readable UI */}
        <div className={styles.floorRailLeft} />
        <div className={styles.floorRailRight} />
        <div className={styles.foregroundEquipmentLeft} />
        <div className={styles.foregroundEquipmentRight} />
        <div className={styles.vignette} />

        {/* The near edge of the room: the deck the telemetry readouts are set
            into. Last in the layer order because it is the closest surface to
            the viewer — everything else in the room sits behind it. */}
        <div className={styles.foregroundDeck} />
      </div>

      <main className={styles.hq}>
        <header className={styles.commandHeader}>
          <div className={styles.headerBrand}>
            <span className={styles.headerEyebrow}>CSBT SECURE MARKET SYSTEM</span>
            <div className={styles.headerWordmark} aria-label="CSBT HUB">
              <strong>CSBT</strong>
              <b>HUB</b>
            </div>
            <small>MM2 TRADING HEADQUARTERS</small>
          </div>

          <div className={styles.headerStatus} aria-label="MM2 data status">
            <div className={styles.livePill}><i /> SYSTEM ONLINE</div>
            <div><small>VALUE SOURCE</small><strong>{source}</strong></div>
            <div><small>CATALOG SYNC</small><strong>{syncedOn}</strong></div>
            <span className={styles.headerMicroClock}>SYNC {syncedClock}</span>
          </div>
        </header>

        <section className={styles.commandRoom} aria-label="MM2 trading command center">
          <section className={styles.vaultZone} aria-label="Weapon Vault">
            {/* Vault architecture: gantry, pillars, racks, dais, light pool.
                Sits behind the artwork and spills past the zone edges. */}
            <div className={styles.vaultFrame} aria-hidden="true">
              <div className={styles.vaultArch} />
              <div className={styles.vaultPillarLeft} />
              <div className={styles.vaultPillarRight} />
              <div className={styles.vaultRackLeft} />
              <div className={styles.vaultRackRight} />
              <div className={styles.vaultCableLeft} />
              <div className={styles.vaultCableRight} />
              <div className={styles.vaultBackGlow} />
              <div className={styles.vaultDais} />
              <div className={styles.vaultDaisRim} />
              <div className={styles.vaultShadow} />
              <div className={styles.vaultFloorSpill} />
            </div>

            <div className={styles.zoneHeading}>
              <div><strong>WEAPON VAULT</strong><span>FEATURED DISPLAY</span></div>
              <div className={styles.headingMeta}>
                <em>VAULT 01</em>
                <span className={styles.headingStatus}><i /> CATALOG READY</span>
              </div>
            </div>

            <div className={styles.vaultArt}>
              <Image
                src="/themes/mm2/neon-armory-market-showcase.png"
                alt="MM2 weapon vault display with weapons, gems and trading equipment"
                fill
                priority
                sizes="(max-width: 1180px) 96vw, 820px"
                className={styles.vaultArtImage}
              />
            </div>

            <aside className={styles.vaultIntel}>
              <span>MARKET LEADER</span>
              <strong>{topWeapon?.NAME ?? "N/A"}</strong>
              <em>{topWeapon?.CATEGORY ?? "MM2 WEAPON"}</em>
              <div>
                <small>SUPREME</small>
                <b>{formatValue(topWeapon?.SOURCE_VALUE)}</b>
              </div>
              <div>
                <small>DEMAND</small>
                <b>{typeof topWeapon?.DEMAND === "number" ? `${topWeapon.DEMAND}/10` : "N/A"}</b>
              </div>
            </aside>

            <div className={styles.vaultFooter}>
              <div><small>DISPLAY STATUS</small><strong>CATALOG CONNECTED</strong></div>
              <i />
              <div><small>GCASH COVERAGE</small><strong>{gcashPriced.toLocaleString("en-US")} ITEMS</strong></div>
              <i />
              <div><small>VAULT LIGHTING</small><strong>ACTIVE</strong></div>
            </div>
          </section>

          <section className={styles.terminalZone} aria-label="Command Terminal">
            <div className={styles.terminalConsoleFrame} aria-hidden="true">
              <i /><i /><i /><i />
            </div>

            <div className={styles.zoneHeading}>
              <div><strong>COMMAND TERMINAL</strong><span>SELECT OPERATION</span></div>
              <div className={styles.headingMeta}>
                <em>MM2 MODE</em>
                <span className={styles.headingStatus}><i /> SYSTEM ONLINE</span>
              </div>
            </div>

            <div className={styles.operationStack}>
              {operations.map((operation, index) => (
                <Link
                  key={operation.href}
                  href={operation.href}
                  className={`${styles.operationButton} ${index === 0 ? styles.operationPrimary : ""}`}
                >
                  <span className={styles.operationMeta}>
                    <i>{operation.index}</i>
                    <small>{operation.tag}</small>
                  </span>
                  <span className={styles.operationIcon}><SystemIcon kind={operation.kind} /></span>
                  <span className={styles.operationCopy}>
                    <strong>{operation.title}</strong>
                    <em>{operation.detail}</em>
                  </span>
                  <span className={styles.operationState}>{index === 0 ? "SELECTED" : "READY"}</span>
                  <b className={styles.operationArrow}>→</b>
                </Link>
              ))}
            </div>

            <div className={styles.quickPanel}>
              <div className={styles.quickHeader}><span>QUICK ACCESS</span><i /></div>
              <div className={styles.quickGrid}>
                {quickAccess.map((item) => (
                  <Link key={`${item.href}-${item.label}`} href={item.href} className={styles.quickButton}>
                    <span><SystemIcon kind={item.kind} /></span>
                    <b>{item.label}</b>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <aside className={styles.intelZone} aria-label="Market and assistant systems">
            <section className={styles.marketRadar}>
              <div className={styles.radarMounts} aria-hidden="true"><i /><i /></div>
              <div className={styles.zoneHeading}>
                <div><strong>MARKET RADAR</strong><span>CATALOG INTELLIGENCE</span></div>
                <div className={styles.headingMeta}>
                  <em>REAL DATA</em>
                  <span className={styles.headingStatus}><i /> SYNCED</span>
                </div>
              </div>

              <div className={styles.radarLeaders}>
                <div className={styles.panelLabel}>TOP VALUE SIGNALS</div>
                {valueLeaders.map((item, index) => {
                  const signal = getDemandSignal(item.DEMAND);
                  return (
                    <div key={`${item.NAME}-${index}`} className={styles.leaderRow}>
                      <span className={styles.leaderRank}>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <strong>{item.NAME}</strong>
                        <div className={styles.leaderMeta}>
                          <small>{item.CATEGORY ?? "MM2"}</small>
                          <span className={`${styles.leaderSignal} ${styles[`leaderSignal${signal.tone[0].toUpperCase()}${signal.tone.slice(1)}`]}`}>
                            <i>{signal.symbol}</i>
                            {signal.label}
                          </span>
                        </div>
                      </div>
                      <b>{formatValue(item.SOURCE_VALUE)}</b>
                    </div>
                  );
                })}
              </div>

              <div className={styles.demandPanel}>
                <div className={styles.panelLabel}>DEMAND DISTRIBUTION</div>
                <div className={styles.demandContent}>
                  <div
                    className={styles.demandRing}
                    style={{
                      background: `conic-gradient(#ef334f 0 ${demandRated ? (highDemand / demandRated) * 100 : 0}%, #9c2438 0 ${demandRated ? ((highDemand + midDemand) / demandRated) * 100 : 0}%, #343b48 0 100%)`,
                    }}
                    aria-label={`${highDemand} high demand, ${midDemand} medium demand, ${lowDemand} low demand`}
                  >
                    <span><strong>{demandRated}</strong><small>RATED</small></span>
                  </div>
                  <div className={styles.demandLegend}>
                    <div><i className={styles.highDot} /><span>HIGH</span><strong>{highDemand}</strong></div>
                    <div><i className={styles.midDot} /><span>MID</span><strong>{midDemand}</strong></div>
                    <div><i className={styles.lowDot} /><span>LOW</span><strong>{lowDemand}</strong></div>
                  </div>
                </div>
                <Link href="/mm2/demand" className={styles.radarLink}>OPEN DEMAND RADAR <b>→</b></Link>
              </div>

              <div className={styles.operationsPanel}>
                <div className={styles.panelLabel}>SYSTEM COVERAGE</div>
                <div className={styles.coverageRow}>
                  <div><span>DEMAND</span><strong>{demandCoverage}%</strong></div>
                  <div className={styles.coverageTrack}><i style={{ width: `${demandCoverage}%` }} /></div>
                </div>
                <div className={styles.coverageRow}>
                  <div><span>GCASH</span><strong>{gcashCoverage}%</strong></div>
                  <div className={styles.coverageTrack}><i style={{ width: `${gcashCoverage}%` }} /></div>
                </div>
                <div className={styles.radarMicroStrip}>
                  <span>GROUP SPREAD</span>
                  <div className={styles.radarSparkline}>
                    {categorySpread.map(([name, count]) => (
                      <i
                        key={name}
                        title={`${name}: ${count.toLocaleString("en-US")}`}
                        style={{
                          height: `${Math.max(14, categorySpreadPeak ? (count / categorySpreadPeak) * 100 : 0)}%`,
                        }}
                      />
                    ))}
                  </div>
                  <strong>{syncedClock}</strong>
                </div>
              </div>
            </section>

            {/* The one interactive island on this page. Everything else stays
                server-rendered; the desk is a client component because it now
                actually answers, scoped to gameId "mm2". */}
            <MM2NichDesk />
          </aside>

          <div className={styles.telemetryStrip} aria-label="MM2 system telemetry">
            <div className={styles.telemetryLead}>
              <small>CSBT / MM2</small>
              <strong>TRADING HQ</strong>
              <span><i /> SYSTEM READY</span>
            </div>

            {telemetry.map((cell) => (
              <div
                key={cell.label}
                className={`${styles.telemetryCell} ${cell.word ? styles.telemetryWord : ""}`}
              >
                <small>{cell.label}</small>
                <strong>{cell.value}</strong>
                {typeof cell.meter === "number" ? (
                  <span className={styles.telemetryMeter}>
                    <i style={{ width: `${Math.min(100, Math.max(0, cell.meter))}%` }} />
                    {cell.caption}
                  </span>
                ) : (
                  <span>{cell.caption}</span>
                )}
              </div>
            ))}

            <div className={styles.telemetryCommunity}>
              <small>COMMUNITY MODULES</small>
              <div>
                <Link href="/mm2/exchange">EXCHANGE</Link>
                <Link href="/mm2/trade-opinions">OPINIONS</Link>
                <Link href="/mm2/lounge">LOUNGE</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
