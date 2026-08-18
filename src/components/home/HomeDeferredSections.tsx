import Stats from "../Stats";
import MeetNich from "./MeetNich";
import QuickActions from "./QuickActions";
import MemberPulse from "./MemberPulse";
import MarketNow from "./MarketNow";
import RobloxTradeJourney from "./RobloxTradeJourney";
import HalloweenHauntedTrail from "./HalloweenHauntedTrail";

export default function HomeDeferredSections({
  totalItems,
  generatedAt,
}: {
  totalItems: number;
  generatedAt: string;
}) {
  return (
    <>
      <div className="roblox-journey-slot mt-8 sm:mt-12"><RobloxTradeJourney /></div>
      <div className="halloween-trail-slot mt-8 sm:mt-12"><HalloweenHauntedTrail /></div>
      <div className="roblox-world-divider" aria-hidden="true"><span>◆</span></div>
      <div className="theme-home-section theme-home-section--market snoopy-home-section snoopy-home-section--market mt-10 sm:mt-14"><MarketNow generatedAt={generatedAt} /></div>
      <div className="snoopy-comic-divider" aria-hidden="true"><span>•••</span><strong>KEEP TRADING</strong><span>→</span></div>
      <div className="roblox-world-divider" aria-hidden="true"><span>★</span></div>
      <div className="theme-home-section theme-home-section--member snoopy-home-section snoopy-home-section--member mt-6"><MemberPulse /></div>
      <div className="theme-home-section theme-home-section--quick snoopy-home-section snoopy-home-section--quick mt-14 sm:mt-20">
        <QuickActions />
      </div>
      <div className="snoopy-comic-divider snoopy-comic-divider--alt" aria-hidden="true"><span>★</span><strong>NEXT PANEL</strong><span>•••</span></div>

      <div className="theme-home-section theme-home-section--nich snoopy-home-section snoopy-home-section--nich mt-16 sm:mt-24">
        <MeetNich />
      </div>

      <section className="theme-home-section theme-home-section--stats snoopy-home-section snoopy-home-section--stats mt-16 sm:mt-24">
        <Stats totalItems={totalItems} />
      </section>
    </>
  );
}
