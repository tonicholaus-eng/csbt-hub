import Link from "next/link";

const stages = [
  { no: "01", href: "/values", kicker: "SPAWN POINT", title: "Find an Item", copy: "Search the full CSBT catalog and open the item you want to trade.", tone: "blue", mark: "⌕" },
  { no: "02", href: "/values", kicker: "VALUE LAB", title: "Check the Value", copy: "Switch between supported value sources and variants without leaving the item page.", tone: "cyan", mark: "◇" },
  { no: "03", href: "/calculator", kicker: "TRADE ARENA", title: "Build the Trade", copy: "Compare both offers and see the estimated difference before you commit.", tone: "orange", mark: "⇄" },
  { no: "04", href: "/demand", kicker: "MARKET LEVEL", title: "Read Demand", copy: "See the market signal behind the number and make a better decision.", tone: "gold", mark: "↗" },
  { no: "05", href: "/nich", kicker: "GUIDE UNLOCKED", title: "Ask NICH", copy: "Get help, discover nearby items, or choose the next CSBT tool.", tone: "purple", mark: "✦" },
] as const;

export default function RobloxTradeJourney() {
  return (
    <section className="roblox-trade-journey" aria-labelledby="roblox-journey-title">
      <div className="roblox-journey-heading">
        <div>
          <span className="roblox-journey-eyebrow">YOUR TRADING QUEST</span>
          <h2 id="roblox-journey-title">Choose your path through CSBT</h2>
          <p>Five connected stages. Start anywhere, then move through the hub like a trading game.</p>
        </div>
        <span className="roblox-journey-level">WORLD 01 · CSBT</span>
      </div>

      <div className="roblox-journey-map">
        <span className="roblox-journey-path roblox-journey-path--one" aria-hidden="true" />
        <span className="roblox-journey-path roblox-journey-path--two" aria-hidden="true" />
        <span className="roblox-journey-path roblox-journey-path--three" aria-hidden="true" />
        <span className="roblox-journey-path roblox-journey-path--four" aria-hidden="true" />

        {stages.map((stage) => (
          <Link key={stage.no} href={stage.href} className={`roblox-journey-stage roblox-journey-stage--${stage.no} roblox-journey-stage--${stage.tone}`}>
            <span className="roblox-stage-number">LEVEL {stage.no}</span>
            <span className="roblox-stage-mark" aria-hidden="true">{stage.mark}</span>
            <div>
              <small>{stage.kicker}</small>
              <h3>{stage.title}</h3>
              <p>{stage.copy}</p>
            </div>
            <span className="roblox-stage-go">GO →</span>
          </Link>
        ))}

        <div className="roblox-journey-finish" aria-hidden="true"><span>★</span><strong>TRADE READY</strong></div>
      </div>
    </section>
  );
}
