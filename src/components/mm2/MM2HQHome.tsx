import Image from "next/image";
import Link from "next/link";
import styles from "./MM2HQHome.module.css";

type MM2Item = {
  NAME: string;
  CATEGORY?: string;
  SOURCE_VALUE?: number | null;
  DEMAND?: number | null;
};

type MM2Meta = {
  totalItems?: number;
  sourceName?: string;
  sourceFetchedAt?: string;
  categoryCounts?: Record<string, number>;
};

type StationIcon = "values" | "calculator" | "exchange" | "opinions" | "lounge";

function StationIcon({ kind }: { kind: StationIcon }) {
  if (kind === "values") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 19V10M12 19V5M19 19v-7" />
        <path d="M3 19h18" />
      </svg>
    );
  }

  if (kind === "calculator") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4v16M5 7h14" />
        <path d="M7 7 4 13h6L7 7ZM17 7l-3 6h6l-3-6Z" />
        <path d="M8 20h8" />
      </svg>
    );
  }

  if (kind === "exchange") {
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

export default function MM2HQHome({
  items,
  meta,
}: {
  items: MM2Item[];
  meta: MM2Meta;
}) {
  const totalItems = meta.totalItems ?? items.length;
  const source = meta.sourceName ?? "Supreme Values";
  const categoryCount =
    Object.keys(meta.categoryCounts ?? {}).length ||
    new Set(items.map((item) => item.CATEGORY).filter(Boolean)).size;
  const demandRated = items.filter((item) => typeof item.DEMAND === "number").length;

  // Provenance, not another copy of the catalog counts the console already shows.
  const syncedAt = meta.sourceFetchedAt ? new Date(meta.sourceFetchedAt) : null;
  const syncedOn =
    syncedAt && !Number.isNaN(syncedAt.getTime())
      ? syncedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "N/A";

  const topWeapon = items.reduce<MM2Item | null>((best, item) => {
    if (typeof item.SOURCE_VALUE !== "number") return best;
    if (!best || typeof best.SOURCE_VALUE !== "number") return item;
    if (item.SOURCE_VALUE > best.SOURCE_VALUE) return item;
    if (item.SOURCE_VALUE === best.SOURCE_VALUE && (item.DEMAND ?? -1) > (best.DEMAND ?? -1)) {
      return item;
    }
    return best;
  }, null);

  return (
    <div className={styles.scene}>
      <div className={styles.facilityEnvironment} aria-hidden="true">
        <div className={styles.ceilingFrame} />
        <div className={styles.leftArchitecture} />
        <div className={styles.rightArchitecture} />
        <div className={styles.rearWall} />
        <div className={styles.floorPlane} />
        <div className={styles.securityLight} />
        <div className={styles.coolDepth} />
        <div className={styles.environmentEquipment}>
          <Image
            src="/themes/mm2/crimson-skins-trading-desk.png"
            alt=""
            fill
            sizes="48vw"
            className={styles.environmentEquipmentImage}
          />
        </div>
        <div className={styles.roomVignette} />
      </div>

      <div className={styles.commandDeck}>
        <header className={styles.facilityHeader}>
          <div className={styles.facilityIdentity}>
            <div className={styles.facilityKicker}>
              <span>CSBT SECURE MARKET SYSTEM</span>
              <i />
              <span>MM2 COMMAND DECK</span>
            </div>
            <div className={styles.facilityBrand} aria-label="CSBT HUB">
              <span className={styles.facilityBrandCsbt}>CSBT</span>
              <span className={styles.facilityBrandHub}>HUB</span>
            </div>
            <div className={styles.facilitySubtitle}>
              <span />
              <strong>MM2 TRADING HEADQUARTERS</strong>
              <span />
            </div>
          </div>

          <div className={styles.headerReadout}>
            <div>
              <small>VALUE NETWORK</small>
              <strong>{source}</strong>
            </div>
            <i />
            <div>
              <small>CATALOG SYNCED</small>
              <strong>{syncedOn}</strong>
            </div>
          </div>
        </header>

        <section className={styles.flagshipDeck} aria-label="MM2 command deck">
          <div className={styles.vaultInstallation}>
            <div className={styles.vaultArchitecture} aria-hidden="true">
              <div className={styles.vaultRearPanel} />
              <div className={styles.vaultUpperBeam} />
              <div className={styles.vaultSideLeft} />
              <div className={styles.vaultSideRight} />
              <div className={styles.vaultBase} />
              <div className={styles.vaultContactLight} />
            </div>

            <div className={styles.vaultLabel}>
              <strong>WEAPON VAULT</strong>
            </div>

            <div className={styles.vaultArtwork}>
              <Image
                src="/themes/mm2/neon-armory-market-showcase.png"
                alt="MM2 weapon vault with knife, revolver, gems and trading display"
                fill
                priority
                sizes="(max-width: 1180px) 94vw, 920px"
                className={styles.vaultArtworkImage}
              />
            </div>

          </div>

          <aside className={styles.tradingConsole}>
            <div className={styles.consoleTopline}>
              <span>MM2 MODE</span>
              <span>TRADING OPERATIONS</span>
            </div>

            <h1>Trade with intelligence.</h1>
            <p className={styles.consoleLead}>
              Check weapon values. Build both sides of a trade. Find listings,
              get community opinions, and stay inside one MM2-focused command center.
            </p>

            <div className={styles.consoleActions}>
              <Link href="/mm2/values" className={styles.primaryAction}>
                Open Weapon Values <span>→</span>
              </Link>
              <Link href="/mm2/calculator" className={styles.secondaryAction}>
                Build a Trade <span>→</span>
              </Link>
            </div>

            <div className={styles.marketSignal}>
              <div className={styles.signalHeader}>
                <span>MARKET INTELLIGENCE</span>
              </div>
              <div className={styles.signalBody}>
                <div>
                  <small>HIGHEST SUPREME VALUE</small>
                  <strong>{topWeapon?.NAME ?? "N/A"}</strong>
                  <span>{topWeapon?.CATEGORY ?? "MM2 WEAPON"}</span>
                </div>
                <div className={styles.signalMetrics}>
                  <div>
                    <small>VALUE</small>
                    <strong>{formatValue(topWeapon?.SOURCE_VALUE)}</strong>
                  </div>
                  <div>
                    <small>DEMAND</small>
                    <strong>{typeof topWeapon?.DEMAND === "number" ? `${topWeapon.DEMAND}/10` : "N/A"}</strong>
                  </div>
                </div>
              </div>
              <Link href="/mm2/demand" className={styles.signalLink}>
                Open Demand Intelligence <span>→</span>
              </Link>
            </div>

            <div className={styles.consoleTelemetry}>
              <div><strong>{totalItems.toLocaleString("en-US")}</strong><span>Weapons</span></div>
              <i />
              <div><strong>{demandRated.toLocaleString("en-US")}</strong><span>Demand-rated</span></div>
              <i />
              <div><strong>{categoryCount}</strong><span>Categories</span></div>
            </div>
          </aside>
        </section>

        <section className={styles.operations} aria-label="MM2 trading operations">
          <div className={styles.operationsHeader}>
            <div>
              <span>TRADING OPERATIONS</span>
              <h2>Choose your station.</h2>
            </div>
            <p>Values, analysis, listings, opinions, and community—built around the same MM2 database.</p>
          </div>

          <div className={styles.operationsGrid}>
            <article className={`${styles.station} ${styles.valuesStation}`}>
              <Image
                src="/themes/mm2/neon-karambit-smoke-emblem.png"
                alt=""
                fill
                sizes="620px"
                className={`${styles.stationArt} ${styles.valuesArt}`}
              />
              <div className={styles.stationShade} />
              <div className={styles.stationContent}>
                <div className={styles.stationHeader}>
                  <span className={styles.stationIcon}><StationIcon kind="values" /></span>
                </div>
                <span className={styles.stationEyebrow}>VALUE INTELLIGENCE</span>
                <h3>Weapon Values</h3>
                <p>Search the complete MM2 catalogue, inspect Supreme values, demand, categories, and weapon profiles.</p>
                <Link href="/mm2/values" className={styles.stationAction}>
                  Enter Value Terminal <span>→</span>
                </Link>
              </div>
            </article>

            <article className={`${styles.station} ${styles.calculatorStation}`}>
              <Image
                src="/themes/mm2/crimson-skins-trading-desk.png"
                alt=""
                fill
                sizes="420px"
                className={`${styles.stationArt} ${styles.calculatorArt}`}
              />
              <div className={styles.stationShade} />
              <div className={styles.stationContent}>
                <div className={styles.stationHeader}>
                  <span className={styles.stationIcon}><StationIcon kind="calculator" /></span>
                </div>
                <span className={styles.stationEyebrow}>TRADE ANALYSIS</span>
                <h3>Calculator</h3>
                <p>Build both offers, compare value, and inspect W / F / L before accepting.</p>
                <Link href="/mm2/calculator" className={styles.stationAction}>Open Calculator <span>→</span></Link>
              </div>
            </article>

            <article className={`${styles.station} ${styles.exchangeStation}`}>
              <Image
                src="/themes/mm2/neon-armory-market-showcase.png"
                alt=""
                fill
                sizes="480px"
                className={`${styles.stationArt} ${styles.exchangeArt}`}
              />
              <div className={styles.stationShade} />
              <div className={styles.stationContent}>
                <div className={styles.stationHeader}>
                  <span className={styles.stationIcon}><StationIcon kind="exchange" /></span>
                </div>
                <span className={styles.stationEyebrow}>LISTINGS & OFFERS</span>
                <h3>CSBT Exchange</h3>
                <p>Browse MM2 listings, create offers, and continue into secure Trade Rooms.</p>
                <Link href="/mm2/exchange" className={styles.stationAction}>Browse Exchange <span>→</span></Link>
              </div>
            </article>

            <article className={`${styles.station} ${styles.opinionsStation}`}>
              <Image
                src="/themes/mm2/neon-market-revolver-accent.png"
                alt=""
                fill
                sizes="500px"
                className={`${styles.stationArt} ${styles.opinionsArt}`}
              />
              <div className={styles.stationShade} />
              <div className={styles.stationContent}>
                <div className={styles.stationHeader}>
                  <span className={styles.stationIcon}><StationIcon kind="opinions" /></span>
                </div>
                <span className={styles.stationEyebrow}>COMMUNITY W / F / L</span>
                <h3>Trade Opinions</h3>
                <p>Publish a trade, see how MM2 traders vote, and open the original trade context again.</p>
                <Link href="/mm2/trade-opinions" className={styles.stationAction}>View Opinions <span>→</span></Link>
              </div>
            </article>

            <article className={`${styles.station} ${styles.loungeStation}`}>
              <Image
                src="/themes/mm2/crimson-skins-trading-desk.png"
                alt=""
                fill
                sizes="400px"
                className={`${styles.stationArt} ${styles.loungeArt}`}
              />
              <div className={styles.stationShade} />
              <div className={styles.stationContent}>
                <div className={styles.stationHeader}>
                  <span className={styles.stationIcon}><StationIcon kind="lounge" /></span>
                </div>
                <span className={styles.stationEyebrow}>COMMUNITY ROOM</span>
                <h3>CSBT Lounge</h3>
                <p>Talk MM2 values, trades, listings, and collecting with the CSBT community.</p>
                <Link href="/mm2/lounge" className={styles.stationAction}>Enter Lounge <span>→</span></Link>
              </div>
            </article>
          </div>
        </section>

      </div>
    </div>
  );
}
