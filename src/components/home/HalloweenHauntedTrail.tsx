import Link from "next/link";

const stops = [
  { no: "01", href: "/values", kicker: "GRAVEYARD GATE", title: "Find an Item", copy: "Enter the catalog and choose what you want to investigate.", tone: "blue", mark: "⌕" },
  { no: "02", href: "/values", kicker: "FORTUNE TENT", title: "Check the Value", copy: "Reveal the supported values and variants before moving on.", tone: "orange", mark: "✦" },
  { no: "03", href: "/calculator", kicker: "TRADE RING", title: "Compare the Trade", copy: "Put both offers under the lanterns and inspect the difference.", tone: "red", mark: "⇄" },
  { no: "04", href: "/demand", kicker: "ORACLE PATH", title: "Read Demand", copy: "Follow the market signal before you make the final call.", tone: "gold", mark: "↗" },
  { no: "05", href: "/nich", kicker: "NICH'S HUT", title: "Ask NICH", copy: "Unlock a second opinion, nearby items, or your next CSBT tool.", tone: "purple", mark: "☾" },
] as const;

export default function HalloweenHauntedTrail() {
  return (
    <section className="halloween-haunted-trail" aria-labelledby="halloween-trail-title">
      <div className="halloween-trail-heading"><div><span className="halloween-trail-eyebrow">HAUNTED TRADING TRAIL</span><h2 id="halloween-trail-title">Follow the lanterns through CSBT</h2><p>Five haunted checkpoints, one trading decision. Start anywhere and move through the midnight market.</p></div><span className="halloween-trail-ticket">ADMIT ONE · CSBT</span></div>
      <div className="halloween-trail-map">
        <span className="halloween-trail-line halloween-trail-line--one"/><span className="halloween-trail-line halloween-trail-line--two"/><span className="halloween-trail-line halloween-trail-line--three"/><span className="halloween-trail-line halloween-trail-line--four"/>
        {stops.map((stop) => <Link key={stop.no} href={stop.href} className={`halloween-trail-stop halloween-trail-stop--${stop.no} halloween-trail-stop--${stop.tone}`}><span className="halloween-stop-number">STOP {stop.no}</span><span className="halloween-stop-icon" aria-hidden="true">{stop.mark}</span><small>{stop.kicker}</small><h3>{stop.title}</h3><p>{stop.copy}</p><b>ENTER →</b></Link>)}
        <span className="halloween-trail-finish" aria-hidden="true"><i>✦</i> TRADE READY</span>
      </div>
    </section>
  );
}
