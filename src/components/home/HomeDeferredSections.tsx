import Stats from "../Stats";
import MeetNich from "./MeetNich";
import QuickActions from "./QuickActions";
import MemberPulse from "./MemberPulse";
import MarketNow from "./MarketNow";

export default function HomeDeferredSections({
  totalItems,
  generatedAt,
}: {
  totalItems: number;
  generatedAt: string;
}) {
  return (
    <>
      <div className="mt-10 sm:mt-14"><MarketNow generatedAt={generatedAt} /></div>
      <div className="mt-6"><MemberPulse /></div>
      <div className="mt-14 sm:mt-20">
        <QuickActions />
      </div>

      <div className="mt-16 sm:mt-24">
        <MeetNich />
      </div>

      <section className="mt-16 sm:mt-24">
        <Stats totalItems={totalItems} />
      </section>
    </>
  );
}
